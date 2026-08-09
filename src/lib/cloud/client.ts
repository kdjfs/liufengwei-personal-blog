import type { SyncBatchResponse, SyncOperation } from '@lfw/contracts/sync';

export interface SyncTransport {
  sync: (operations: SyncOperation[]) => Promise<SyncBatchResponse>;
}

export class CloudRequestError extends Error {
  readonly status: number | undefined;
  readonly retryable: boolean;

  constructor(message: string, status: number | undefined, retryable: boolean) {
    super(message);
    this.name = 'CloudRequestError';
    this.status = status;
    this.retryable = retryable;
  }
}

export interface CloudClientOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export class CloudClient implements SyncTransport {
  private readonly fetch: typeof fetch;
  private readonly syncUrl: URL;
  private readonly timeoutMs: number;

  constructor(apiOrigin: string, options: CloudClientOptions = {}) {
    const origin = new URL(apiOrigin);
    if (origin.origin !== apiOrigin.replace(/\/$/, '')) {
      throw new Error('Cloud API URL must be a path-free origin');
    }
    this.fetch = options.fetch ?? globalThis.fetch;
    this.syncUrl = new URL('/api/v1/sync/batch', origin);
    this.timeoutMs = options.timeoutMs ?? 8_000;
  }

  async sync(operations: SyncOperation[]): Promise<SyncBatchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetch(this.syncUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operations }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new CloudRequestError(
          `Cloud sync failed with status ${response.status}`,
          response.status,
          response.status === 429 || response.status >= 500,
        );
      }
      return (await response.json()) as SyncBatchResponse;
    } catch (error) {
      if (error instanceof CloudRequestError) throw error;
      const timedOut = controller.signal.aborted;
      throw new CloudRequestError(
        timedOut ? 'Cloud sync timed out' : 'Cloud sync is unavailable',
        undefined,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
