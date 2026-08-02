export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  maxBuckets?: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  private readonly limit: number;

  private readonly windowMs: number;

  private readonly maxBuckets: number;

  constructor({ limit, windowMs, maxBuckets = 5000 }: RateLimiterOptions) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxBuckets = maxBuckets;
  }

  check(identifier: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const recent = (this.buckets.get(identifier) ?? []).filter((timestamp) => timestamp >= cutoff);

    if (recent.length >= this.limit) {
      this.buckets.set(identifier, recent);
      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000)),
      };
    }

    recent.push(now);
    this.buckets.set(identifier, recent);
    if (this.buckets.size > this.maxBuckets) this.prune(cutoff);

    return {
      allowed: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - recent.length),
      retryAfterSeconds: 0,
    };
  }

  private prune(cutoff: number): void {
    for (const [identifier, timestamps] of this.buckets) {
      const recent = timestamps.filter((timestamp) => timestamp >= cutoff);
      if (recent.length === 0) this.buckets.delete(identifier);
      else this.buckets.set(identifier, recent);
      if (this.buckets.size <= this.maxBuckets) break;
    }
  }
}
