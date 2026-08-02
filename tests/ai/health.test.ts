import assert from 'node:assert/strict';
import test from 'node:test';
import { handleAIHealth } from '../../api/ai-health.ts';

test('AI health reports only safe production configuration metadata', async () => {
  const response = handleAIHealth({
    DEEPSEEK_API_KEY: 'unit-test-credential',
    DEEPSEEK_BASE_URL: 'https://api.deepseek.com/anthropic',
    DEEPSEEK_MODEL: 'deepseek-v4-pro',
  });
  assert.deepEqual(await response.json(), {
    ok: true,
    configured: true,
    model: 'deepseek-v4-pro',
    provider: 'DeepSeek',
    runtime: 'vercel',
  });
});

test('AI health treats missing, placeholder, and invalid keys as unconfigured', async () => {
  for (const key of [undefined, 'replace_me', '含中文的-key']) {
    const response = handleAIHealth({ DEEPSEEK_API_KEY: key });
    const body = await response.json();
    assert.equal(body.configured, false);
    assert.equal(JSON.stringify(body).includes('unit-test'), false);
    assert.equal(Object.hasOwn(body, 'baseUrl'), false);
  }
});
