import type {
  CloudAnnotation,
  CloudFavorite,
  SyncBatchResponse,
  SyncOperation,
} from '@lfw/contracts/sync';
import type { LearningDatabase } from '../learning/db.ts';
import type {
  Annotation,
  LocalFavorite,
  LocalSyncSnapshot,
  QueuedSyncOperation,
} from '../learning/types.ts';
import type { SyncTransport } from './client.ts';
import { CloudRequestError } from './client.ts';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncAttemptResult {
  status: Exclude<SyncStatus, 'syncing'>;
  attempted: number;
}

interface SyncOptions {
  now?: () => Date;
  random?: () => number;
}

export function retryDelay(attempt: number, random = Math.random): number {
  const exponential = 500 * 2 ** Math.max(0, attempt - 1);
  return Math.min(60_000, Math.round(exponential + exponential * 0.5 * random()));
}

function localAnnotation(annotation: CloudAnnotation): Annotation {
  return {
    id: annotation.annotationId,
    articleSlug: annotation.articleSlug,
    articleTitle: annotation.articleTitle,
    selectedText: annotation.selectedText,
    note: annotation.note,
    headingId: annotation.headingId,
    headingText: annotation.headingText,
    prefix: annotation.quotePrefix,
    exact: annotation.quoteExact,
    suffix: annotation.quoteSuffix,
    createdAt: annotation.createdAt,
    updatedAt: annotation.sourceUpdatedAt,
    deletedAt: annotation.deletedAt ?? undefined,
    serverVersion: annotation.version,
  };
}

function localFavorite(favorite: CloudFavorite): LocalFavorite {
  return {
    articleSlug: favorite.articleSlug,
    createdAt: favorite.sourceUpdatedAt,
    updatedAt: favorite.sourceUpdatedAt,
    deletedAt: favorite.deletedAt ?? undefined,
    serverVersion: favorite.version,
  };
}

function localSnapshot(response: SyncBatchResponse): LocalSyncSnapshot {
  return {
    progress: response.progress.map((record) => ({
      ...record,
      completedAt: record.completedAt ?? undefined,
    })),
    annotations: response.annotations.map(localAnnotation),
    favorites: response.favorites.map(localFavorite),
    cursor: response.cursor,
  };
}

function dueOperations(operations: QueuedSyncOperation[], now: Date): QueuedSyncOperation[] {
  return operations
    .filter((operation) => !operation.nextAttemptAt || operation.nextAttemptAt <= now.toISOString())
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(0, 50);
}

export async function syncPendingOperations(
  database: LearningDatabase,
  transport: SyncTransport,
  options: SyncOptions = {},
): Promise<SyncAttemptResult> {
  const now = options.now ?? (() => new Date());
  const random = options.random ?? Math.random;
  const pending = dueOperations(await database.getAll('syncQueue'), now());
  if (pending.length === 0) return { status: 'local', attempted: 0 };

  try {
    const operations = pending.map(
      ({ attempts: _attempts, nextAttemptAt: _next, ...operation }) => operation,
    ) as SyncOperation[];
    const response = await transport.sync(operations);
    const sentIds = new Set(pending.map((operation) => operation.operationId));
    const acknowledged = response.results
      .map((result) => result.operationId)
      .filter((operationId) => sentIds.has(operationId));
    await database.applySyncSnapshot(localSnapshot(response), acknowledged);
    return { status: 'synced', attempted: pending.length };
  } catch (error) {
    const retryable = !(error instanceof CloudRequestError) || error.retryable;
    if (retryable) {
      const failedAt = now();
      await database.rescheduleOperations(
        pending.map((operation) => {
          const attempts = operation.attempts + 1;
          return {
            ...operation,
            attempts,
            nextAttemptAt: new Date(
              failedAt.getTime() + retryDelay(attempts, random),
            ).toISOString(),
          };
        }),
      );
    }
    return {
      status: retryable ? 'offline' : 'error',
      attempted: pending.length,
    };
  }
}
