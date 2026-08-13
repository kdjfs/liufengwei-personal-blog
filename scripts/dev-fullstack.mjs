import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { loadLocalDevEnvironment } from './local-ai-environment.mjs';

const local = loadLocalDevEnvironment();
const environment = {
  DATABASE_URL: 'mysql://lfw:lfw_local_only@127.0.0.1:3307/lfw_space',
  REDIS_URL: 'redis://127.0.0.1:6380/0',
  SESSION_SECRET: 'lfw_fullstack_local_only_session_secret',
  ...local.environment,
  NODE_ENV: 'development',
  API_PORT: '8788',
  API_ORIGIN: 'http://127.0.0.1:8788',
  WEB_ORIGIN: 'http://localhost:4321',
  PUBLIC_CLOUD_API_URL: 'http://127.0.0.1:8788',
  PUBLIC_AI_API_URL: 'http://127.0.0.1:8788',
  LFW_AI_DEV_MODE: 'cloud',
};

function runSetup(command, args, label) {
  console.log(`[LFW Full-stack] ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${label}失败（exit ${result.status ?? 1}）`);
  }
}

runSetup('docker', ['compose', 'up', '-d', '--wait'], '启动 MySQL + Redis…');
runSetup(
  process.execPath,
  [
    '--disable-warning=ExperimentalWarning',
    '--experimental-strip-types',
    'server/src/db/migrate.ts',
  ],
  '执行数据库迁移…',
);

const children = new Map();
let shuttingDown = false;

function start(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.set(name, child);
  child.once('error', (error) => {
    console.error(`[LFW Full-stack] ${name} 启动失败：${error.message}`);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(name);
    if (shuttingDown) return;
    console.error(
      `[LFW Full-stack] ${name} 已退出（${signal ? `signal ${signal}` : `code ${code ?? 1}`}）。`,
    );
    shutdown(code ?? 1);
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  for (const child of children.values()) {
    if (!child.killed) child.kill('SIGTERM');
  }
  const deadline = setTimeout(() => process.exit(exitCode), 3_000);
  deadline.unref();
}

console.log('[LFW Full-stack] Web 4321 + Fastify 8788 + MySQL + Redis。');
start('Fastify API', [
  '--disable-warning=ExperimentalWarning',
  '--experimental-strip-types',
  '--watch',
  'server/src/index.ts',
]);
start('Astro Web', [path.resolve('scripts/dev.mjs')]);

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
