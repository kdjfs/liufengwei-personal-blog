import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const lookup =
  process.platform === 'win32'
    ? spawnSync('where.exe', ['vercel'], { stdio: 'ignore' })
    : spawnSync('sh', ['-c', 'command -v vercel'], { stdio: 'ignore' });

if (lookup.status !== 0) {
  console.error(`
[LFW AI] 未检测到 Vercel CLI，普通博客开发仍可使用 pnpm dev。
[LFW AI] 完整 AI 联调请先安装：pnpm add --global vercel
[LFW AI] 安装后重新运行：pnpm dev:ai
`);
  process.exitCode = 1;
} else {
  const child = spawn('pnpm', ['exec', 'vercel', 'dev'], {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

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
