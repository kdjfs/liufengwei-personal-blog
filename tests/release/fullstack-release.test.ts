import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function read(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('API image is multi-stage, non-root, health-checked, and keeps migrations explicit', async () => {
  const dockerfile = await read('server/Dockerfile');
  assert.ok((dockerfile.match(/^FROM /gm) ?? []).length >= 2);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /^HEALTHCHECK .*\/health\/live/m);
  assert.match(dockerfile, /server\/src\/index\.ts/);
  assert.doesNotMatch(dockerfile, /db\/migrate\.ts.*(?:CMD|ENTRYPOINT)/);
});

test('Docker context excludes local outputs, VCS metadata, and every real env file', async () => {
  const dockerignore = await read('.dockerignore');
  for (const entry of ['.git', 'node_modules', 'dist', '.env', '.env.*']) {
    assert.match(dockerignore, new RegExp(`^${entry.replace('.', '\\.')}$`, 'm'));
  }
});

test('Linux CI enforces secret, Docker migration/health, and both cloud UI viewports', async () => {
  const workflow = await read('.github/workflows/ci.yml');
  assert.match(workflow, /pnpm secret:scan/);
  assert.match(workflow, /pnpm docker:smoke/);
  assert.match(workflow, /playwright test tests\/e2e\/cloud-ui\.spec\.ts\s*$/m);
  assert.doesNotMatch(workflow, /cloud-ui\.spec\.ts --project=/);
});
