import { readFile, stat, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const outfile = 'api/chat.mjs';

await build({
  entryPoints: ['api/_chat-handler.ts'],
  outfile,
  bundle: true,
  minify: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'none',
  sourcemap: false,
  logLevel: 'silent',
});

const bundledSource = await readFile(outfile, 'utf8');
await writeFile(outfile, bundledSource.replace(/[\t ]+(?=\r?\n)/g, ''), 'utf8');

const output = await stat(outfile);
console.log(`[LFW AI] Vercel Function bundle ready: ${Math.ceil(output.size / 1024)} KiB`);
