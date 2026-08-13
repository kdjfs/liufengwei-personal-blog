import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { BLOG_DIRECTORY } from './content/core.mjs';
import { prepareContentDirectory } from './content/prepare.mjs';
import {
  getApiKeyStatus,
  inspectLocalGateway,
  LOCAL_AI_HEALTH_URL,
  LOCAL_AI_PORT,
  loadLocalDevEnvironment,
} from './local-ai-environment.mjs';

let timer;
let preparing = false;
let pending = false;
let shuttingDown = false;
const changedFiles = new Set();
const children = new Map();

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForStableFiles(files) {
  for (const file of files) {
    let previous;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      let current;
      try {
        const details = await stat(file);
        current = `${details.size}:${details.mtimeMs}`;
      } catch {
        break;
      }
      if (current === previous) break;
      previous = current;
      await delay(180);
    }
  }
}

async function prepareChangedContent() {
  if (preparing) {
    pending = true;
    return;
  }
  preparing = true;
  try {
    const result = await prepareContentDirectory();
    if (result.changed > 0) {
      console.log(`\n[LFW Content] Prepared ${result.changed} Markdown file(s).`);
    }
  } catch (error) {
    console.error(
      `\n[LFW Content] Prepare failed: ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    preparing = false;
    if (pending) {
      pending = false;
      await prepareChangedContent();
    }
  }
}

function startChild(name, args, environment) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.set(name, child);
  child.once('error', (error) => {
    console.error(`[LFW Dev] ${name} 启动失败：${error.message}`);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(name);
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(`[LFW Dev] ${name} 已退出（${reason}）。`);
    shutdown(code ?? 1);
  });
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  clearTimeout(timer);
  watcher.close();
  for (const child of children.values()) {
    if (!child.killed) child.kill('SIGTERM');
  }
  const deadline = setTimeout(() => process.exit(exitCode), 3_000);
  deadline.unref();
}

await prepareChangedContent();

const watcher = watch(BLOG_DIRECTORY, { recursive: true }, (_event, filename) => {
  if (!filename || !['.md', '.mdx'].includes(path.extname(String(filename)).toLowerCase())) return;
  const target = path.resolve(BLOG_DIRECTORY, String(filename));
  const relative = path.relative(BLOG_DIRECTORY, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return;
  changedFiles.add(target);
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const files = [...changedFiles];
    changedFiles.clear();
    await waitForStableFiles(files);
    await prepareChangedContent();
  }, 320);
});
console.log('[LFW Content] Watcher ready.');

const local = loadLocalDevEnvironment();
const environment = local.environment;
const requestedMode = process.env.LFW_AI_DEV_MODE === 'cloud' ? 'cloud' : 'local';
const strictAi = process.env.LFW_AI_STRICT === '1';
const keyStatus = getApiKeyStatus(environment.DEEPSEEK_API_KEY);
let startGateway = false;

if (requestedMode === 'local') {
  if (keyStatus !== 'configured') {
    const suffix = keyStatus === 'invalid' ? '（Key 包含非法字符）' : '';
    const message = `[LFW AI] 未配置本地 AI Key，本次仅启动 Web。${suffix}`;
    if (strictAi) {
      console.error(message);
      watcher.close();
      process.exit(1);
    }
    console.log(message);
  } else {
    const gateway = await inspectLocalGateway();
    if (gateway.state === 'available') {
      startGateway = true;
    } else if (gateway.state === 'lfw' && gateway.configured) {
      console.log(`[LFW AI] 复用已运行的 Local Gateway：${LOCAL_AI_HEALTH_URL}`);
    } else {
      const message =
        gateway.state === 'occupied'
          ? `[LFW AI] 端口 ${LOCAL_AI_PORT} 已被其他程序占用，无法启动 Local Gateway。`
          : `[LFW AI] 端口 ${LOCAL_AI_PORT} 上的旧 Gateway 未配置有效 Key，请先关闭后重试。`;
      console.error(message);
      if (strictAi) {
        watcher.close();
        process.exit(1);
      }
    }
  }
}

const cliArgs = process.argv.slice(2);
const astroArgs = cliArgs[0] === '--' ? cliArgs.slice(1) : cliArgs;
const childEnvironment = {
  ...environment,
  ASTRO_DEV_BACKGROUND: '0',
  PUBLIC_LFW_AI_MODE: requestedMode,
};

console.log(
  requestedMode === 'local'
    ? '[LFW Dev] 启动 Astro + Content Watch + 可选 Local AI。'
    : '[LFW Dev] 启动 Astro + Content Watch，AI 使用 Full-stack Cloud API。',
);
startChild(
  'Astro Dev',
  [path.resolve('node_modules/astro/bin/astro.mjs'), 'dev', '--ignore-lock', ...astroArgs],
  childEnvironment,
);

if (startGateway) {
  startChild(
    'Local AI Gateway',
    [
      '--disable-warning=ExperimentalWarning',
      '--experimental-strip-types',
      'scripts/ai-local-server.ts',
    ],
    environment,
  );
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
