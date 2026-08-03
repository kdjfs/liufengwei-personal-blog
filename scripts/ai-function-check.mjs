/**
 * Checks that the production Vercel Function bundle (api/chat.mjs)
 * is in sync with the current source code.
 *
 * Builds a temp bundle and compares the minified source against
 * the committed api/chat.mjs. Exits with code 1 if they differ.
 */

import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const COMMITTED_BUNDLE = 'api/chat.mjs';

async function buildTempBundle() {
  const dir = await mkdtemp(join(tmpdir(), 'lfw-ai-check-'));
  const outfile = join(dir, 'chat.mjs');

  try {
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

    let source = await readFile(outfile, 'utf8');
    source = source.replace(/[\t ]+(?=\r?\n)/g, '');
    return source;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  const committed = await readFile(COMMITTED_BUNDLE, 'utf8');
  const rebuilt = await buildTempBundle();

  const committedHash = createHash('sha256').update(committed).digest('hex');
  const rebuiltHash = createHash('sha256').update(rebuilt).digest('hex');

  if (committedHash === rebuiltHash) {
    console.log('[LFW AI] Bundle check passed: api/chat.mjs matches source.');
    const committedSize = (await stat(COMMITTED_BUNDLE)).size;
    console.log(`         Bundle size: ${Math.ceil(committedSize / 1024)} KiB`);
    process.exit(0);
  }

  console.error('[LFW AI] Bundle DRIFT detected!');
  console.error(`         Committed hash: ${committedHash}`);
  console.error(`         Rebuilt hash:   ${rebuiltHash}`);
  console.error('         Run pnpm ai:function:build to regenerate api/chat.mjs.');
  console.error('         Then commit the updated bundle.');
  process.exit(1);
}

main().catch((error) => {
  console.error('[LFW AI] Bundle check error:', error.message);
  process.exit(1);
});
