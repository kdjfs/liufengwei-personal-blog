import type { SyncOperation } from '@lfw/contracts/sync';
import type { LearningDatabase } from '../learning/db.ts';
import type {
  Annotation,
  ArticleProgress,
  LocalFavorite,
  QueuedSyncOperation,
} from '../learning/types.ts';
import { requestCloudSync } from './runtime.ts';

function operationId(): string {
  return globalThis.crypto.randomUUID();
}

function queued(operation: SyncOperation): QueuedSyncOperation {
  return { ...operation, attempts: 0 };
}

export async function queueProgressMutation(
  database: LearningDatabase,
  record: ArticleProgress,
  deviceId: string,
  id = operationId(),
): Promise<void> {
  const operation = {
    operationId: id,
    deviceId,
    entityType: 'progress',
    entityId: record.articleSlug,
    operation: 'upsert',
    createdAt: record.lastReadAt,
    payload: {
      articleSlug: record.articleSlug,
      title: record.title,
      category: record.category,
      readSeconds: record.readSeconds,
      listenSeconds: record.listenSeconds,
      maxProgress: record.maxProgress,
      lastProgress: record.lastProgress,
      lastHeadingId: record.lastHeadingId,
      lastScrollY: record.lastScrollY,
      firstReadAt: record.firstReadAt,
      lastReadAt: record.lastReadAt,
      completedAt: record.completedAt ?? null,
    },
  } satisfies SyncOperation;
  await database.putAndQueue('articleProgress', record, queued(operation));
  requestCloudSync(database);
}

export async function queueAnnotationMutation(
  database: LearningDatabase,
  annotation: Annotation,
  deviceId: string,
  action: 'upsert' | 'delete',
  id = operationId(),
): Promise<void> {
  const operation = {
    operationId: id,
    deviceId,
    entityType: 'annotation',
    entityId: annotation.id,
    operation: action,
    createdAt: annotation.updatedAt,
    payload: {
      annotationId: annotation.id,
      articleSlug: annotation.articleSlug,
      articleTitle: annotation.articleTitle,
      selectedText: annotation.selectedText,
      note: annotation.note,
      headingId: annotation.headingId,
      headingText: annotation.headingText,
      quoteExact: annotation.exact,
      quotePrefix: annotation.prefix,
      quoteSuffix: annotation.suffix,
      color: 'yellow',
      createdAt: annotation.createdAt,
      sourceUpdatedAt: annotation.updatedAt,
      baseVersion: annotation.serverVersion ?? null,
      deletedAt: annotation.deletedAt ?? null,
    },
  } satisfies SyncOperation;
  await database.putAndQueue('annotations', annotation, queued(operation));
  requestCloudSync(database);
}

export async function queueFavoriteMutation(
  database: LearningDatabase,
  favorite: LocalFavorite,
  deviceId: string,
  action: 'upsert' | 'delete',
  id = operationId(),
): Promise<void> {
  const operation = {
    operationId: id,
    deviceId,
    entityType: 'favorite',
    entityId: favorite.articleSlug,
    operation: action,
    createdAt: favorite.updatedAt,
    payload: {
      articleSlug: favorite.articleSlug,
      sourceUpdatedAt: favorite.updatedAt,
      baseVersion: favorite.serverVersion ?? null,
      deletedAt: favorite.deletedAt ?? null,
    },
  } satisfies SyncOperation;
  await database.putAndQueue('favorites', favorite, queued(operation));
  requestCloudSync(database);
}
