import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('CI uses pinned runtimes, frozen installs, least privilege, and the release gate', async () => {
  const workflow = await readFile('.github/workflows/ci.yml', 'utf8');

  assert.match(workflow, /permissions:\s*\r?\n\s+contents: read/);
  assert.match(workflow, /node-version: ['"]?22['"]?/);
  assert.match(workflow, /version: 10\.24\.0/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /pnpm release:check/);
  assert.match(workflow, /pull_request:\s*\r?\n\s+branches: \[main\]/);
  assert.doesNotMatch(workflow, /pull_request_target|DEEPSEEK_API_KEY|ANTHROPIC_AUTH_TOKEN/);
});

test('Vercel applies browser security and immutable asset headers', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8')) as {
    headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const allHeaders = config.headers?.flatMap((entry) => entry.headers) ?? [];
  const names = new Set(allHeaders.map((header) => header.key.toLowerCase()));

  for (const required of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
    'permissions-policy',
  ]) {
    assert.equal(names.has(required), true, `missing ${required}`);
  }
  assert.equal(
    config.headers?.some(
      (entry) =>
        entry.source.includes('_astro') &&
        entry.headers.some((header) => header.value.includes('immutable')),
    ),
    true,
  );
});

test('Playwright E2E blocks service workers and mocks every AI request', async () => {
  const config = await readFile('playwright.config.ts', 'utf8');
  const specs = await readFile('tests/e2e/critical-flows.spec.ts', 'utf8');

  assert.match(config, /serviceWorkers:\s*'block'/);
  assert.match(config, /webServer:/);
  assert.match(specs, /route\('\*\*\/api\/chat'/);
  assert.match(specs, /route\.fulfill/);
  assert.doesNotMatch(specs, /api\.deepseek\.com|DEEPSEEK_API_KEY|ANTHROPIC_AUTH_TOKEN/);
});

test('Astro maps Redis CLI fences to a bundled Shiki language', async () => {
  const config = (await import('../../astro.config.mjs')).default;
  const shikiConfig = config.markdown?.shikiConfig;

  assert.equal(shikiConfig?.langAlias?.redis, 'shell');
});

test('release manifest pins v1 and patched production dependencies', async () => {
  const manifest = JSON.parse(await readFile('package.json', 'utf8')) as {
    version?: string;
    dependencies?: Record<string, string>;
    pnpm?: { overrides?: Record<string, string> };
  };
  const releaseCheck = await readFile('scripts/release-check.mjs', 'utf8');

  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.dependencies?.mermaid, '11.16.1');
  assert.equal(manifest.pnpm?.overrides?.['dompurify@<=3.4.12'], '3.4.13');
  assert.equal(manifest.pnpm?.overrides?.['nanoid@<3.3.17'], '3.3.17');
  assert.match(releaseCheck, /\['audit', '--prod'\]/);
  assert.match(releaseCheck, /process\.env\.npm_execpath/);
  assert.doesNotMatch(releaseCheck, /pnpm\.cmd/);
});
