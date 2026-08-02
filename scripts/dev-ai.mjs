import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

const children = new Map();
let shuttingDown = false;

function start(name, args, env = process.env) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.set(name, child);
  child.on('error', (error) => {
    console.error(`[LFW AI] ${name} 启动失败：${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(name);
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(`[LFW AI] ${name} 已退出（${reason}），正在关闭本地联调服务。`);
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

console.log('[LFW AI] 启动 Astro Dev + Local AI Gateway（无需 Vercel 登录）');
start('Astro Dev', [resolve('node_modules/astro/bin/astro.mjs'), 'dev', '--ignore-lock'], {
  ...process.env,
  ASTRO_DEV_BACKGROUND: '0',
});
start('Local AI Gateway', [
  '--disable-warning=ExperimentalWarning',
  '--experimental-strip-types',
  'scripts/ai-local-server.ts',
]);

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
