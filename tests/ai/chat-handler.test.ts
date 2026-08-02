import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryRateLimiter } from '../../api/_rate-limit.ts';
import { handleChat } from '../../api/chat.ts';

function createDependencies(overrides: Record<string, unknown> = {}) {
  return {
    environment: {
      DEEPSEEK_API_KEY: 'unit-test-key',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
      SITE_URL: 'https://lfw.example',
      VERCEL: '1',
    },
    rateLimiter: new InMemoryRateLimiter({ limit: 10, windowMs: 60_000 }),
    now: () => 100,
    ...overrides,
  };
}

test('handleChat rejects methods other than POST', async () => {
  const response = await handleChat(
    new Request('https://lfw.example/api/chat', { method: 'GET' }),
    createDependencies(),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('handleChat rejects cross-origin browser requests', async () => {
  const response = await handleChat(
    new Request('https://lfw.example/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://attacker.invalid' },
      body: '{}',
    }),
    createDependencies(),
  );

  assert.equal(response.status, 403);
});

test('handleChat maps a missing production API key to a safe service error', async () => {
  const response = await handleChat(
    new Request('https://lfw.example/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'fast', messages: [{ role: 'user', content: '你好' }] }),
    }),
    createDependencies({ environment: { VERCEL: '1' } }),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: { code: 'AI_NOT_CONFIGURED', message: 'AI 服务尚未配置' },
  });
});

test('handleChat sends a server-owned request and streams provider SSE', async () => {
  let upstreamUrl = '';
  let upstreamBody: Record<string, unknown> | undefined;
  let upstreamKey = '';
  const fetchImpl: typeof fetch = async (input, init) => {
    upstreamUrl = String(input);
    upstreamBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    upstreamKey = new Headers(init?.headers).get('x-api-key') ?? '';
    return new Response(
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"你好"}}\n\n',
      { headers: { 'content-type': 'text/event-stream' } },
    );
  };
  const request = new Request('https://lfw.example/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://lfw.example',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({
      mode: 'deep',
      messages: [{ role: 'user', content: '总结文章' }],
      context: [],
    }),
  });

  const response = await handleChat(request, createDependencies({ fetchImpl }));

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  assert.equal(await response.text(),
    'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"你好"}}\n\n',
  );
  assert.equal(upstreamUrl, 'https://api.deepseek.com/anthropic/v1/messages');
  assert.equal(upstreamKey, 'unit-test-key');
  assert.equal(upstreamBody?.model, 'deepseek-v4-pro');
  assert.deepEqual(upstreamBody?.thinking, { type: 'enabled' });
  assert.deepEqual(upstreamBody?.output_config, { effort: 'max' });
});
