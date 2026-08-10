import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AiCoordinationUnavailableError,
  createAiCoordinator,
  type RedisScriptClient,
} from '../src/ai/coordinator.ts';

class ScriptRedis implements RedisScriptClient {
  readonly calls: Array<{ script: string; keys: string[]; arguments: string[] }> = [];
  private readonly replies: unknown[];

  constructor(replies: unknown[]) {
    this.replies = replies;
  }

  async eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown> {
    this.calls.push({ script, ...options });
    const reply = this.replies.shift();
    if (reply instanceof Error) throw reply;
    return reply;
  }
}

test('distributed rate limit uses an opaque Redis key and returns retry metadata', async () => {
  const redis = new ScriptRedis([
    [1, 11, 600_000],
    [0, 0, 42_001],
  ]);
  const coordinator = createAiCoordinator(redis, {
    now: () => 1_000,
    randomUUID: () => '31154ec8-ae6a-42ca-9b63-f40018377c87',
  });

  const accepted = await coordinator.checkRateLimit('user-opaque-id');
  const denied = await coordinator.checkRateLimit('user-opaque-id');

  assert.deepEqual(accepted, { allowed: true, limit: 12, remaining: 11, retryAfterSeconds: 0 });
  assert.deepEqual(denied, { allowed: false, limit: 12, remaining: 0, retryAfterSeconds: 43 });
  assert.match(redis.calls[0]?.keys[0] ?? '', /^lfw:\{ai\}:rate:user-opaque-id$/);
  assert.equal(redis.calls[0]?.arguments.includes('600000'), true);
});

test('concurrency lease atomically covers user and global capacity and releases by owner token', async () => {
  const redis = new ScriptRedis([[1, 1, 3], 2]);
  const coordinator = createAiCoordinator(redis, {
    now: () => 12_345,
    randomUUID: () => '31154ec8-ae6a-42ca-9b63-f40018377c87',
  });

  const lease = await coordinator.acquireLease('user-opaque-id');
  assert.equal(lease?.ownerToken, '31154ec8-ae6a-42ca-9b63-f40018377c87');
  assert.deepEqual(redis.calls[0]?.keys, [
    'lfw:{ai}:lease:user:user-opaque-id',
    'lfw:{ai}:lease:global',
  ]);
  await lease?.release();
  assert.deepEqual(redis.calls[1]?.arguments, ['31154ec8-ae6a-42ca-9b63-f40018377c87']);
  assert.match(redis.calls[1]?.script ?? '', /ZREM/);
});

test('concurrency denial does not return a releasable lease', async () => {
  const redis = new ScriptRedis([[0, 2, 8]]);
  const coordinator = createAiCoordinator(redis);
  assert.equal(await coordinator.acquireLease('anonymous-hash'), null);
  assert.equal(redis.calls.length, 1);
});

test('Redis outages fail closed for AI cost controls', async () => {
  const coordinator = createAiCoordinator(new ScriptRedis([new Error('redis secret host')]));
  await assert.rejects(
    coordinator.checkRateLimit('anonymous-hash'),
    (error: unknown) => error instanceof AiCoordinationUnavailableError,
  );
});
