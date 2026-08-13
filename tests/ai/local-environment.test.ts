import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiKeyStatus, inspectLocalGateway } from '../../scripts/local-ai-environment.mjs';

test('getApiKeyStatus classifies configuration without exposing credential content', () => {
  assert.equal(getApiKeyStatus(undefined), 'missing');
  assert.equal(getApiKeyStatus(''), 'missing');
  assert.equal(getApiKeyStatus('replace_me'), 'placeholder');
  assert.equal(getApiKeyStatus('your-deepseek-api-key'), 'placeholder');
  assert.equal(getApiKeyStatus('sk-example\n'), 'configured');
  assert.equal(getApiKeyStatus('sk-示例'), 'invalid');
});

test('inspectLocalGateway recognizes only the LFW health signature', async () => {
  const lfw = await inspectLocalGateway({
    fetchImpl: async () =>
      Response.json({
        service: 'lfw-ai-local',
        ok: true,
        configured: true,
        model: 'deepseek-v4-pro',
      }),
  });
  assert.deepEqual(lfw, { state: 'lfw', configured: true, model: 'deepseek-v4-pro' });
});
