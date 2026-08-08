import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const outfile = 'api/chat.mjs';
const checkOnly = process.argv.includes('--check');

const result = await build({
  entryPoints: ['api/_chat-handler.ts'],
  outfile: 'chat.mjs',
  bundle: true,
  minify: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'none',
  sourcemap: false,
  logLevel: 'silent',
  write: false,
});

const bundledSource = result.outputFiles[0]?.text.replace(/[\t ]+(?=\r?\n)/g, '');
if (!bundledSource) throw new Error('AI function bundler produced no output');

if (checkOnly) {
  const currentSource = await readFile(outfile, 'utf8').catch(() => '');
  if (currentSource !== bundledSource) {
    console.error('[LFW AI] api/chat.mjs is stale. Run pnpm ai:function:build.');
    process.exitCode = 1;
  } else {
    console.log('[LFW AI] Vercel Function bundle is current.');
  }
} else {
  await writeFile(outfile, bundledSource, 'utf8');
  console.log(
    `[LFW AI] Vercel Function bundle ready: ${Math.ceil(Buffer.byteLength(bundledSource) / 1024)} KiB`,
  );
}
