import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { BLOG_DIRECTORY } from './content/core.mjs';
import { prepareContentDirectory } from './content/prepare.mjs';

let timer;
let preparing = false;
let pending = false;
const changedFiles = new Set();

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

const cliArgs = process.argv.slice(2);
const astroArgs = cliArgs[0] === '--' ? cliArgs.slice(1) : cliArgs;
const child = spawn('pnpm', ['exec', 'astro', 'dev', ...astroArgs], {
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

function shutdown(signal) {
  clearTimeout(timer);
  watcher.close();
  if (!child.killed) child.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
child.on('exit', (code, signal) => {
  watcher.close();
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 0;
});
