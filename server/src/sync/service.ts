import {
  type AnnotationPayload,
  type CloudAnnotation,
  type CloudFavorite,
  type FavoritePayload,
  type ProgressPayload,
  type SyncBatchRequest,
  type SyncBatchResponse,
  type SyncOperation,
  syncBatchResponseSchema,
} from '@lfw/contracts/sync';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { annotations, favorites, learningProgressDevices, syncOperations } from '../db/schema.ts';
import { aggregateProgress, type DeviceProgressState, resolveVersionedMutation } from './merge.ts';

export interface SyncService {
  sync: (userId: string, request: SyncBatchRequest) => Promise<SyncBatchResponse>;
}

type ProgressOperation = Extract<SyncOperation, { entityType: 'progress' }>;
type AnnotationOperation = Extract<SyncOperation, { entityType: 'annotation' }>;
type FavoriteOperation = Extract<SyncOperation, { entityType: 'favorite' }>;

function date(value: string): Date {
  return new Date(value);
}

function nullableDate(value: string | null): Date | null {
  return value === null ? null : date(value);
}

function asDeviceProgress(row: typeof learningProgressDevices.$inferSelect): DeviceProgressState {
  return {
    articleSlug: row.articleSlug,
    deviceId: row.deviceId,
    title: row.title,
    category: row.category,
    readSeconds: row.readSeconds,
    listenSeconds: row.listenSeconds,
    maxProgress: row.maxProgress,
    resumeProgress: row.resumeProgress ?? 0,
    resumeHeadingId: row.resumeHeadingId ?? undefined,
    resumeScrollY: row.resumeScrollY ?? 0,
    firstReadAt: row.firstReadAt,
    lastActivityAt: row.lastActivityAt,
    completedAt: row.completedAt,
  };
}

function annotationSnapshot(row: typeof annotations.$inferSelect): CloudAnnotation {
  return {
    annotationId: row.annotationId,
    articleSlug: row.articleSlug,
    articleTitle: row.articleTitle,
    selectedText: row.selectedText,
    note: row.note,
    headingId: row.headingId ?? undefined,
    headingText: row.headingText ?? undefined,
    quoteExact: row.quoteExact,
    quotePrefix: row.quotePrefix,
    quoteSuffix: row.quoteSuffix,
    color: row.color,
    createdAt: row.sourceCreatedAt.toISOString(),
    sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    version: row.version,
    serverUpdatedAt: row.updatedAt.toISOString(),
  };
}

function favoriteSnapshot(row: typeof favorites.$inferSelect): CloudFavorite {
  return {
    articleSlug: row.articleSlug,
    sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    version: row.version,
    serverUpdatedAt: row.updatedAt.toISOString(),
  };
}

export function createSyncService(database: Database): SyncService {
  return {
    async sync(userId, request) {
      return database.transaction(async (transaction) => {
        const serverNow = new Date();

        const applyProgress = async (operation: ProgressOperation): Promise<void> => {
          const payload: ProgressPayload = operation.payload;
          await transaction
            .insert(learningProgressDevices)
            .values({
              userId,
              articleSlug: payload.articleSlug,
              deviceId: operation.deviceId,
              title: payload.title,
              category: payload.category,
              readSeconds: payload.readSeconds,
              listenSeconds: payload.listenSeconds,
              maxProgress: payload.maxProgress,
              resumeHeadingId: payload.lastHeadingId ?? null,
              resumeProgress: payload.lastProgress,
              resumeScrollY: payload.lastScrollY,
              firstReadAt: date(payload.firstReadAt),
              lastActivityAt: date(payload.lastReadAt),
              completedAt: nullableDate(payload.completedAt),
              updatedAt: serverNow,
            })
            .onDuplicateKeyUpdate({
              set: {
                title: sql`if(values(last_activity_at) > ${learningProgressDevices.lastActivityAt}, values(title), ${learningProgressDevices.title})`,
                category: sql`if(values(last_activity_at) > ${learningProgressDevices.lastActivityAt}, values(category), ${learningProgressDevices.category})`,
                readSeconds: sql`greatest(${learningProgressDevices.readSeconds}, values(read_seconds))`,
                listenSeconds: sql`greatest(${learningProgressDevices.listenSeconds}, values(listen_seconds))`,
                maxProgress: sql`greatest(${learningProgressDevices.maxProgress}, values(max_progress))`,
                resumeHeadingId: sql`if(values(last_activity_at) > ${learningProgressDevices.lastActivityAt}, values(resume_heading_id), ${learningProgressDevices.resumeHeadingId})`,
                resumeProgress: sql`if(values(last_activity_at) > ${learningProgressDevices.lastActivityAt}, values(resume_progress), ${learningProgressDevices.resumeProgress})`,
                resumeScrollY: sql`if(values(last_activity_at) > ${learningProgressDevices.lastActivityAt}, values(resume_scroll_y), ${learningProgressDevices.resumeScrollY})`,
                firstReadAt: sql`least(${learningProgressDevices.firstReadAt}, values(first_read_at))`,
                completedAt: sql`case
                  when ${learningProgressDevices.completedAt} is null then values(completed_at)
                  when values(completed_at) is null then ${learningProgressDevices.completedAt}
                  else least(${learningProgressDevices.completedAt}, values(completed_at))
                end`,
                updatedAt: serverNow,
                lastActivityAt: sql`greatest(${learningProgressDevices.lastActivityAt}, values(last_activity_at))`,
              },
            });
        };

        const applyAnnotation = async (
          operation: AnnotationOperation,
        ): Promise<'applied' | 'conflict'> => {
          const payload: AnnotationPayload = operation.payload;
          const [existing] = await transaction
            .select()
            .from(annotations)
            .where(
              and(
                eq(annotations.userId, userId),
                eq(annotations.annotationId, payload.annotationId),
              ),
            )
            .for('update');
          const resolution = resolveVersionedMutation(
            existing ? { version: existing.version, value: existing } : undefined,
            payload.baseVersion,
            existing,
          );
          if (resolution.status === 'conflict') return 'conflict';

          const values = {
            userId,
            annotationId: payload.annotationId,
            articleSlug: payload.articleSlug,
            articleTitle: payload.articleTitle,
            selectedText: payload.selectedText,
            headingId: payload.headingId ?? null,
            headingText: payload.headingText ?? null,
            quoteExact: payload.quoteExact,
            quotePrefix: payload.quotePrefix,
            quoteSuffix: payload.quoteSuffix,
            note: payload.note,
            color: payload.color,
            version: resolution.record.version,
            sourceCreatedAt: date(payload.createdAt),
            sourceUpdatedAt: date(payload.sourceUpdatedAt),
            deletedAt: nullableDate(payload.deletedAt),
            updatedAt: serverNow,
          };
          if (existing) {
            await transaction
              .update(annotations)
              .set(values)
              .where(eq(annotations.id, existing.id));
          } else {
            await transaction.insert(annotations).values(values);
          }
          return 'applied';
        };

        const applyFavorite = async (
          operation: FavoriteOperation,
        ): Promise<'applied' | 'conflict'> => {
          const payload: FavoritePayload = operation.payload;
          const [existing] = await transaction
            .select()
            .from(favorites)
            .where(
              and(eq(favorites.userId, userId), eq(favorites.articleSlug, payload.articleSlug)),
            )
            .for('update');
          const resolution = resolveVersionedMutation(
            existing ? { version: existing.version, value: existing } : undefined,
            payload.baseVersion,
            existing,
          );
          if (resolution.status === 'conflict') return 'conflict';

          const values = {
            userId,
            articleSlug: payload.articleSlug,
            version: resolution.record.version,
            sourceUpdatedAt: date(payload.sourceUpdatedAt),
            deletedAt: nullableDate(payload.deletedAt),
            updatedAt: serverNow,
          };
          if (existing) {
            await transaction.update(favorites).set(values).where(eq(favorites.id, existing.id));
          } else {
            await transaction.insert(favorites).values(values);
          }
          return 'applied';
        };

        const results: SyncBatchResponse['results'] = [];
        for (const operation of request.operations) {
          const insertResult = await transaction.insert(syncOperations).ignore().values({
            userId,
            operationId: operation.operationId,
            deviceId: operation.deviceId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            operation: operation.operation,
          });
          if (insertResult[0].affectedRows === 0) {
            results.push({ operationId: operation.operationId, status: 'duplicate' });
            continue;
          }

          let status: 'applied' | 'conflict' = 'applied';
          if (operation.entityType === 'progress') await applyProgress(operation);
          if (operation.entityType === 'annotation') status = await applyAnnotation(operation);
          if (operation.entityType === 'favorite') status = await applyFavorite(operation);
          results.push({ operationId: operation.operationId, status });
        }

        const progressRows = await transaction
          .select()
          .from(learningProgressDevices)
          .where(eq(learningProgressDevices.userId, userId));
        const progressByArticle = new Map<string, DeviceProgressState[]>();
        for (const row of progressRows) {
          const records = progressByArticle.get(row.articleSlug) ?? [];
          records.push(asDeviceProgress(row));
          progressByArticle.set(row.articleSlug, records);
        }
        const progress = [...progressByArticle.values()].map((records) => {
          const aggregate = aggregateProgress(records);
          return {
            articleSlug: aggregate.articleSlug,
            title: aggregate.title,
            category: aggregate.category,
            readSeconds: aggregate.readSeconds,
            listenSeconds: aggregate.listenSeconds,
            maxProgress: aggregate.maxProgress,
            lastProgress: aggregate.resumeProgress,
            lastHeadingId: aggregate.resumeHeadingId,
            lastScrollY: aggregate.resumeScrollY,
            firstReadAt: aggregate.firstReadAt.toISOString(),
            lastReadAt: aggregate.lastActivityAt.toISOString(),
            completedAt: aggregate.completedAt?.toISOString() ?? null,
          };
        });
        const annotationRows = await transaction
          .select()
          .from(annotations)
          .where(eq(annotations.userId, userId));
        const favoriteRows = await transaction
          .select()
          .from(favorites)
          .where(eq(favorites.userId, userId));

        return syncBatchResponseSchema.parse({
          results,
          progress,
          annotations: annotationRows.map(annotationSnapshot),
          favorites: favoriteRows.map(favoriteSnapshot),
          cursor: serverNow.toISOString(),
        });
      });
    },
  };
}
