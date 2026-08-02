import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Vercel CLI (Rust) cannot handle non-ASCII PATH entries.
// Remove them from process.env.PATH BEFORE spawning so the child
// inherits a clean PATH directly (without cmd.exe re-injecting garbage).
function isAscii(input) {
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code > 127 || code < 32) return false;
  }
  return input.length > 0;
}

const cleanEntries = (process.env.PATH ?? '')
  .split(path.delimiter)
  .filter(isAscii);

const pnpmHome =
  process.env.PNPM_HOME ||
  path.join(process.env.LOCALAPPDATA ?? '', 'pnpm');

if (!cleanEntries.includes(pnpmHome)) {
  cleanEntries.unshift(pnpmHome);
}

process.env.PATH = cleanEntries.join(path.delimiter);

// Locate vercel
const candidates = [
  path.join(pnpmHome, 'vercel.cmd'),
  ...cleanEntries.map((dir) => path.join(dir, 'vercel.cmd')),
];

let vercelBin = '';
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    vercelBin = candidate;
    break;
  }
}

if (!vercelBin) {
  console.error(`
[LFW AI] 未检测到 Vercel CLI，普通博客开发仍可使用 pnpm dev。
[LFW AI] 完整 AI 联调请先安装：pnpm add --global vercel
[LFW AI] 安装后重新运行：pnpm dev:ai
`);
  process.exitCode = 1;
} else {
  // cmd.exe /d /c 执行 .cmd 文件，子进程继承已清理的 PATH
  const child = spawn(
    'cmd.exe',
    ['/d', '/c', vercelBin, 'dev'],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    },
  );

  child.on('error', (error) => {
    console.error(`[LFW AI] 无法启动 Vercel Dev：${error.message}`);
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 0;
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  }
}
