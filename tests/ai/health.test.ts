import assert from 'node:assert/strict';
import test from 'node:test';
import vercelHealth, { healthPayload } from '../../api/ai-health.ts';

test('AI health exposes a Vercel Node handler default export', () => {
  assert.equal(typeof vercelHealth, 'function');
});

test('AI health reports only safe production configuration metadata', () => {
  const body = healthPayload({
    DEEPSEEK_API_KEY: 'unit-test-credential',
    DEEPSEEK_BASE_URL: 'https://api.deepseek.com/anthropic',
    DEEPSEEK_MODEL: 'deepseek-v4-pro',
  });
  assert.deepEqual(body, {
    ok: true,
    configured: true,
    model: 'deepseek-v4-pro',
    provider: 'DeepSeek',
    runtime: 'vercel',
  });
});

test('AI health treats missing, placeholder, and invalid keys as unconfigured', () => {
  for (const key of [undefined, 'replace_me', '含中文的-key']) {
    const body = healthPayload({ DEEPSEEK_API_KEY: key });
    assert.equal(body.configured, false);
    assert.equal(JSON.stringify(body).includes('unit-test'), false);
    assert.equal(Object.hasOwn(body, 'baseUrl'), false);
  }
});
