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
