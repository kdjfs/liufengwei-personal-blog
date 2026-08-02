import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryRateLimiter } from '../../api/_rate-limit.ts';

test('InMemoryRateLimiter enforces a sliding request window', () => {
  const limiter = new InMemoryRateLimiter({ limit: 2, windowMs: 1000 });

  assert.deepEqual(limiter.check('visitor', 100), {
    allowed: true,
    limit: 2,
    remaining: 1,
    retryAfterSeconds: 0,
  });
  assert.equal(limiter.check('visitor', 200).allowed, true);
  assert.deepEqual(limiter.check('visitor', 300), {
    allowed: false,
    limit: 2,
    remaining: 0,
    retryAfterSeconds: 1,
  });
  assert.equal(limiter.check('visitor', 1200).allowed, true);
});

test('InMemoryRateLimiter isolates visitors', () => {
  const limiter = new InMemoryRateLimiter({ limit: 1, windowMs: 1000 });
  assert.equal(limiter.check('visitor-a', 100).allowed, true);
  assert.equal(limiter.check('visitor-a', 101).allowed, false);
  assert.equal(limiter.check('visitor-b', 101).allowed, true);
});
