import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatRequestPayload } from '@lfw/contracts/ai';
import {
  AiCoordinationUnavailableError,
  type AiCoordinator,
  type AiLease,
} from '../src/ai/coordinator.ts';
import type { AiProvider } from '../src/ai/provider.ts';
import type {
  AiRepository,
  PrivateLearningContext,
  StartExchangeInput,
} from '../src/ai/repository.ts';
import { buildApp } from '../src/app.ts';
import { parseServerConfig } from '../src/config.ts';

const config = parseServerConfig({
  NODE_ENV: 'test',
  API_ORIGIN: 'http://127.0.0.1:8788',
  DATABASE_URL: 'mysql://user:password@127.0.0.1:3306/lfw_test',
  REDIS_URL: 'redis://127.0.0.1:6379/0',
  WEB_ORIGIN: 'http://127.0.0.1:4321',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-characters',
});

const payload = {
  mode: 'fast',
  messages: [{ role: 'user', content: '解释 Redis lease' }],
  context: [],
} as const;

function probes() {
  return { mysql: { async check() {} }, redis: { async check() {} } };
}

class MemoryRepository implements AiRepository {
  privateContext: PrivateLearningContext = {
    progress: [],
    annotations: [{ articleSlug: 'redis-lease', selectedText: 'lease', note: '我的笔记' }],
    favorites: [],
  };
  readCalls: string[][] = [];
  starts: StartExchangeInput[] = [];
  finishes: Array<{ conversationId: string; content: string }> = [];

  async readPrivateContext(_userId: string, articleSlugs: string[]) {
    this.readCalls.push(articleSlugs);
    return this.privateContext;
  }

  async startExchange(input: StartExchangeInput) {
    this.starts.push(input);
    return '4a464be3-3fb7-4dca-915d-253589e15cb8';
  }

  async finishExchange(conversationId: string, _mode: 'fast' | 'deep', content: string) {
    this.finishes.push({ conversationId, content });
  }
}

function coordinator(overrides: Partial<AiCoordinator> = {}) {
  let releases = 0;
  const lease: AiLease = {
    ownerToken: 'lease-owner',
    async release() {
      releases += 1;
    },
  };
  return {
    value: {
      async checkRateLimit() {
        return { allowed: true, limit: 12, remaining: 11, retryAfterSeconds: 0 };
      },
      async acquireLease() {
        return lease;
      },
      ...overrides,
    } satisfies AiCoordinator,
    releases: () => releases,
  };
}

function provider(
  onCall?: (input: ChatRequestPayload, context: PrivateLearningContext | null) => void,
) {
  return {
    async openStream(
      input: ChatRequestPayload,
      context: PrivateLearningContext | null,
      _signal: AbortSignal,
    ) {
      onCall?.(input, context);
      return new Response(
        'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"租约"}}\n\n',
        { headers: { 'content-type': 'text/event-stream' } },
      );
    },
  } satisfies AiProvider;
}

test('Node AI route preserves anonymous SSE and releases the distributed lease', async () => {
  const control = coordinator();
  const repository = new MemoryRepository();
  let providerCalls = 0;
  let authCalls = 0;
  const app = await buildApp({
    config,
    probes: probes(),
    ai: {
      coordinator: control.value,
      provider: provider(() => {
        providerCalls += 1;
      }),
      repository,
      async getUserId() {
        authCalls += 1;
        return null;
      },
    },
  });
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/chat',
    headers: { origin: config.webOrigin, 'content-type': 'application/json' },
    payload,
  });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type'] ?? '', /text\/event-stream/);
  assert.match(response.body, /text_delta/);
  assert.equal(response.headers['x-ratelimit-remaining'], '11');
  assert.equal(providerCalls, 1);
  assert.equal(authCalls, 0);
  assert.equal(control.releases(), 1);
  await app.close();
});

test('private context and conversation storage are explicit, authenticated, and relevant', async () => {
  const control = coordinator();
  const repository = new MemoryRepository();
  let observedContext: PrivateLearningContext | null = null;
  const app = await buildApp({
    config,
    probes: probes(),
    ai: {
      coordinator: control.value,
      provider: provider((_input, context) => {
        observedContext = context;
      }),
      repository,
      async getUserId() {
        return 'user-a';
      },
    },
  });
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/chat',
    headers: { origin: config.webOrigin, 'content-type': 'application/json' },
    payload: {
      ...payload,
      selection: { text: 'lease', articleSlug: 'redis-lease' },
      cloud: { persistConversation: true, privateLearningContext: true },
    },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(repository.readCalls, [['redis-lease']]);
  assert.deepEqual(observedContext, repository.privateContext);
  assert.equal(repository.starts[0]?.userId, 'user-a');
  assert.equal(repository.starts[0]?.privateLearningContext, true);
  assert.equal(response.headers['x-lfw-conversation-id'], '4a464be3-3fb7-4dca-915d-253589e15cb8');
  assert.deepEqual(repository.finishes, [
    { conversationId: '4a464be3-3fb7-4dca-915d-253589e15cb8', content: '租约' },
  ]);
  await app.close();
});

test('AI route blocks untrusted origins and anonymous cloud access before provider use', async () => {
  const repository = new MemoryRepository();
  let providerCalls = 0;
  const app = await buildApp({
    config,
    probes: probes(),
    ai: {
      coordinator: coordinator().value,
      provider: provider(() => {
        providerCalls += 1;
      }),
      repository,
      async getUserId() {
        return null;
      },
    },
  });
  const forbidden = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/chat',
    headers: { origin: 'https://attacker.invalid', 'content-type': 'application/json' },
    payload,
  });
  const anonymousCloud = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/chat',
    headers: { origin: config.webOrigin, 'content-type': 'application/json' },
    payload: { ...payload, cloud: { privateLearningContext: true } },
  });
  assert.equal(forbidden.statusCode, 403);
  assert.equal(anonymousCloud.statusCode, 401);
  assert.equal(providerCalls, 0);
  await app.close();
});

test('Redis outage and distributed limit fail closed without reaching the provider', async () => {
  const repository = new MemoryRepository();
  let providerCalls = 0;
  const unavailable = coordinator({
    async checkRateLimit() {
      throw new AiCoordinationUnavailableError();
    },
  });
  const app = await buildApp({
    config,
    probes: probes(),
    ai: {
      coordinator: unavailable.value,
      provider: provider(() => {
        providerCalls += 1;
      }),
      repository,
      async getUserId() {
        return null;
      },
    },
  });
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/chat',
    headers: { origin: config.webOrigin, 'content-type': 'application/json' },
    payload,
  });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error.code, 'AI_COORDINATION_UNAVAILABLE');
  assert.equal(providerCalls, 0);
  await app.close();
});
