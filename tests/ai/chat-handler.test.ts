import assert from 'node:assert/strict';
import test from 'node:test';
import vercelChat, { handleChat } from '../../api/_chat-handler.ts';
import { InMemoryRateLimiter } from '../../api/_rate-limit.ts';

test('chat exposes a Vercel Node handler default export', () => {
  assert.equal(typeof vercelChat, 'function');
});

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
    randomUUID: () => 'request-test-id',
    logger: { info() {}, error() {} },
    ...overrides,
  };
}

function createChatRequest(body: Record<string, unknown> = {}): Request {
  return new Request('https://lfw.example/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://lfw.example' },
    body: JSON.stringify({
      mode: 'fast',
      messages: [{ role: 'user', content: '你好' }],
      context: [],
      ...body,
    }),
  });
}

test('handleChat rejects methods other than POST', async () => {
  const response = await handleChat(
    new Request('https://lfw.example/api/chat', { method: 'GET' }),
    createDependencies(),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.equal(response.headers.get('x-lfw-ai-request-id'), 'request-test-id');
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
    error: {
      code: 'AI_NOT_CONFIGURED',
      message: 'AI 服务尚未配置',
      requestId: 'request-test-id',
    },
  });
});

test('handleChat rejects placeholder and Unicode API keys before fetch', async () => {
  for (const key of ['replace_me', '<your-api-key>']) {
    const response = await handleChat(
      createChatRequest(),
      createDependencies({ environment: { DEEPSEEK_API_KEY: key, VERCEL: '1' } }),
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'AI_NOT_CONFIGURED');
  }

  const invalid = await handleChat(
    createChatRequest(),
    createDependencies({ environment: { DEEPSEEK_API_KEY: '含中文的-key', VERCEL: '1' } }),
  );
  assert.equal(invalid.status, 503);
  assert.equal((await invalid.json()).error.code, 'AI_CONFIGURATION_ERROR');
});

test('handleChat maps DeepSeek upstream statuses without exposing upstream bodies in production', async () => {
  const cases = [
    [400, 'AI_BAD_REQUEST'],
    [401, 'AI_AUTH_ERROR'],
    [403, 'AI_AUTH_ERROR'],
    [404, 'AI_ENDPOINT_ERROR'],
    [422, 'AI_BAD_REQUEST'],
    [429, 'AI_BUSY'],
    [500, 'AI_UPSTREAM_ERROR'],
    [503, 'AI_UPSTREAM_ERROR'],
  ] as const;

  for (const [status, code] of cases) {
    const response = await handleChat(
      createChatRequest(),
      createDependencies({
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: { message: 'safe upstream detail' } }), {
            status,
            headers: { 'content-type': 'application/json' },
          }),
      }),
    );
    const payload = await response.json();
    assert.equal(payload.error.code, code);
    assert.equal(payload.error.requestId, 'request-test-id');
    assert.equal(payload.error.upstreamMessage, undefined);
    assert.equal(response.headers.get('x-lfw-ai-request-id'), 'request-test-id');
  }
});

test('handleChat includes sanitized upstream diagnostics only in local development', async () => {
  const response = await handleChat(
    createChatRequest(),
    createDependencies({
      environment: {
        DEEPSEEK_API_KEY: 'unit-test-key',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com/anthropic',
        DEEPSEEK_MODEL: 'deepseek-v4-pro',
        LFW_AI_LOCAL: '1',
      },
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: 'invalid request field' } }), {
          status: 400,
        }),
    }),
  );
  const payload = await response.json();
  assert.equal(payload.error.code, 'AI_BAD_REQUEST');
  assert.equal(payload.error.upstreamStatus, 400);
  assert.equal(payload.error.upstreamMessage, 'invalid request field');
});

test('handleChat distinguishes fetch, ByteString, and timeout failures', async () => {
  const network = await handleChat(
    createChatRequest(),
    createDependencies({
      fetchImpl: async () => {
        throw new TypeError('fetch failed');
      },
    }),
  );
  assert.equal((await network.json()).error.code, 'AI_UPSTREAM_UNAVAILABLE');

  const byteString = await handleChat(
    createChatRequest(),
    createDependencies({
      fetchImpl: async () => {
        throw new TypeError('Cannot convert argument to a ByteString');
      },
    }),
  );
  assert.equal((await byteString.json()).error.code, 'AI_CONFIGURATION_ERROR');

  const timeout = await handleChat(
    createChatRequest(),
    createDependencies({
      fetchImpl: async (_input: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
      upstreamTimeoutMs: 5,
    }),
  );
  assert.equal((await timeout.json()).error.code, 'AI_TIMEOUT');
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
  assert.equal(response.headers.get('x-lfw-ai-request-id'), 'request-test-id');
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  assert.equal(
    await response.text(),
    'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"你好"}}\n\n',
  );
  assert.equal(upstreamUrl, 'https://api.deepseek.com/anthropic/v1/messages');
  assert.equal(upstreamKey, 'unit-test-key');
  assert.equal(upstreamBody?.model, 'deepseek-v4-pro');
  assert.deepEqual(upstreamBody?.thinking, { type: 'enabled' });
  assert.deepEqual(upstreamBody?.output_config, { effort: 'max' });
  assert.deepEqual(upstreamBody?.messages, [
    { role: 'user', content: [{ type: 'text', text: '总结文章' }] },
  ]);
});
