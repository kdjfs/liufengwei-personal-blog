import { randomUUID as createRandomUUID } from 'node:crypto';

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  ttl = tonumber(ARGV[2])
end
local limit = tonumber(ARGV[1])
if count > limit then return {0, 0, ttl} end
return {1, limit - count, ttl}
`;

const ACQUIRE_LEASE_SCRIPT = `
local now = tonumber(ARGV[1])
local expires = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
local userCount = redis.call('ZCARD', KEYS[1])
local globalCount = redis.call('ZCARD', KEYS[2])
if userCount >= tonumber(ARGV[4]) or globalCount >= tonumber(ARGV[5]) then
  return {0, userCount, globalCount}
end
redis.call('ZADD', KEYS[1], expires, ARGV[3])
redis.call('ZADD', KEYS[2], expires, ARGV[3])
local ttl = expires - now + 1000
redis.call('PEXPIRE', KEYS[1], ttl)
redis.call('PEXPIRE', KEYS[2], ttl)
return {1, userCount + 1, globalCount + 1}
`;

const RELEASE_LEASE_SCRIPT = `
local userRemoved = redis.call('ZREM', KEYS[1], ARGV[1])
local globalRemoved = redis.call('ZREM', KEYS[2], ARGV[1])
return userRemoved + globalRemoved
`;

export interface RedisScriptClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}

export interface AiRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface AiLease {
  ownerToken: string;
  release: () => Promise<void>;
}

export interface AiCoordinator {
  checkRateLimit(identifier: string): Promise<AiRateLimitResult>;
  acquireLease(identifier: string): Promise<AiLease | null>;
}

interface CoordinatorOptions {
  rateLimit?: number;
  rateWindowMs?: number;
  userConcurrency?: number;
  globalConcurrency?: number;
  leaseTtlMs?: number;
  now?: () => number;
  randomUUID?: () => string;
}

export class AiCoordinationUnavailableError extends Error {
  constructor() {
    super('AI coordination is unavailable');
    this.name = 'AiCoordinationUnavailableError';
  }
}

function numericReply(value: unknown, expectedLength: number): number[] {
  if (!Array.isArray(value) || value.length < expectedLength) {
    throw new AiCoordinationUnavailableError();
  }
  const numbers = value.map(Number);
  if (numbers.some((number) => !Number.isFinite(number))) {
    throw new AiCoordinationUnavailableError();
  }
  return numbers;
}

export function createAiCoordinator(
  redis: RedisScriptClient,
  options: CoordinatorOptions = {},
): AiCoordinator {
  const rateLimit = options.rateLimit ?? 12;
  const rateWindowMs = options.rateWindowMs ?? 10 * 60 * 1_000;
  const userConcurrency = options.userConcurrency ?? 2;
  const globalConcurrency = options.globalConcurrency ?? 8;
  const leaseTtlMs = options.leaseTtlMs ?? 65_000;
  const now = options.now ?? Date.now;
  const randomUUID = options.randomUUID ?? createRandomUUID;

  return {
    async checkRateLimit(identifier) {
      try {
        const [allowed, remaining, ttl] = numericReply(
          await redis.eval(RATE_LIMIT_SCRIPT, {
            keys: [`lfw:{ai}:rate:${identifier}`],
            arguments: [String(rateLimit), String(rateWindowMs)],
          }),
          3,
        );
        return {
          allowed: allowed === 1,
          limit: rateLimit,
          remaining: remaining ?? 0,
          retryAfterSeconds: allowed === 1 ? 0 : Math.max(1, Math.ceil((ttl ?? 0) / 1_000)),
        };
      } catch (error) {
        if (error instanceof AiCoordinationUnavailableError) throw error;
        throw new AiCoordinationUnavailableError();
      }
    },

    async acquireLease(identifier) {
      const ownerToken = randomUUID();
      const userKey = `lfw:{ai}:lease:user:${identifier}`;
      const globalKey = 'lfw:{ai}:lease:global';
      try {
        const timestamp = now();
        const [acquired] = numericReply(
          await redis.eval(ACQUIRE_LEASE_SCRIPT, {
            keys: [userKey, globalKey],
            arguments: [
              String(timestamp),
              String(timestamp + leaseTtlMs),
              ownerToken,
              String(userConcurrency),
              String(globalConcurrency),
            ],
          }),
          3,
        );
        if (acquired !== 1) return null;

        let released = false;
        return {
          ownerToken,
          async release() {
            if (released) return;
            released = true;
            try {
              await redis.eval(RELEASE_LEASE_SCRIPT, {
                keys: [userKey, globalKey],
                arguments: [ownerToken],
              });
            } catch {
              // The TTL remains the final safety net when an ownership-aware release cannot run.
            }
          },
        };
      } catch (error) {
        if (error instanceof AiCoordinationUnavailableError) throw error;
        throw new AiCoordinationUnavailableError();
      }
    },
  };
}
