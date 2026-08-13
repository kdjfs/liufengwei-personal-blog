import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createLocalAiServer, isAllowedLocalOrigin } from '../../scripts/ai-local-server.ts';

test('local AI gateway CORS permits HTTP loopback origins on any port', () => {
  assert.equal(isAllowedLocalOrigin('http://localhost:4321'), true);
  assert.equal(isAllowedLocalOrigin('http://127.0.0.1:4321'), true);
  assert.equal(isAllowedLocalOrigin('http://localhost:4322'), true);
  assert.equal(isAllowedLocalOrigin('http://127.0.0.1:9876'), true);
  assert.equal(isAllowedLocalOrigin('http://[::1]:4321'), true);
});

test('local AI gateway CORS rejects non-HTTP and disguised loopback origins', () => {
  assert.equal(isAllowedLocalOrigin('https://localhost:4321'), false);
  assert.equal(isAllowedLocalOrigin('http://localhost.evil.com:4321'), false);
  assert.equal(isAllowedLocalOrigin('http://127.0.0.1.evil.com:4321'), false);
  assert.equal(isAllowedLocalOrigin('file://localhost/etc/passwd'), false);
  assert.equal(isAllowedLocalOrigin('https://attacker.invalid'), false);
  assert.equal(isAllowedLocalOrigin('null'), false);
  assert.equal(isAllowedLocalOrigin(undefined), false);
});

test('local AI gateway health is safe and does not require an Origin header', async (context) => {
  const server = createLocalAiServer({
    DEEPSEEK_API_KEY: 'sk-private-value-that-must-not-leak',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), {
    service: 'lfw-ai-local',
    ok: true,
    configured: true,
    model: 'deepseek-v4-pro',
  });
  assert.equal(text.includes('sk-private-value'), false);
});

test('local AI gateway preflight permits credentialed requests from dynamic loopback ports', async (context) => {
  const server = createLocalAiServer({ DEEPSEEK_API_KEY: 'sk-test-only' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/chat`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:4322',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:4322');
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
});
