import { z } from 'zod';

const uuidSchema = z.uuid();
const instantSchema = z.iso.datetime({ offset: true });
const slugSchema = z.string().trim().min(1).max(255);
const entityIdSchema = z.string().trim().min(1).max(255);
const baseOperationSchema = z.object({
  operationId: uuidSchema,
  deviceId: uuidSchema,
  entityId: entityIdSchema,
  createdAt: instantSchema,
});

export const progressPayloadSchema = z.object({
  articleSlug: slugSchema,
  title: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(128),
  readSeconds: z.number().int().min(0).max(2_147_483_647),
  listenSeconds: z.number().int().min(0).max(2_147_483_647),
  maxProgress: z.number().min(0).max(100),
  lastProgress: z.number().min(0).max(100),
  lastHeadingId: z.string().trim().min(1).max(255).optional(),
  lastScrollY: z.number().int().min(0).max(2_147_483_647),
  firstReadAt: instantSchema,
  lastReadAt: instantSchema,
  completedAt: instantSchema.nullable(),
});

export const annotationPayloadSchema = z.object({
  annotationId: uuidSchema,
  articleSlug: slugSchema,
  articleTitle: z.string().trim().min(1).max(255),
  selectedText: z.string().max(20_000),
  note: z.string().max(20_000),
  headingId: z.string().trim().min(1).max(255).optional(),
  headingText: z.string().max(1_000).optional(),
  quoteExact: z.string().max(20_000),
  quotePrefix: z.string().max(2_000),
  quoteSuffix: z.string().max(2_000),
  color: z.string().trim().min(1).max(32),
  createdAt: instantSchema,
  sourceUpdatedAt: instantSchema,
  baseVersion: z.number().int().min(0).nullable(),
  deletedAt: instantSchema.nullable(),
});

export const favoritePayloadSchema = z.object({
  articleSlug: slugSchema,
  sourceUpdatedAt: instantSchema,
  baseVersion: z.number().int().min(0).nullable(),
  deletedAt: instantSchema.nullable(),
});

const progressOperationSchema = baseOperationSchema.extend({
  entityType: z.literal('progress'),
  operation: z.literal('upsert'),
  payload: progressPayloadSchema,
});

const annotationOperationSchema = baseOperationSchema.extend({
  entityType: z.literal('annotation'),
  operation: z.enum(['upsert', 'delete']),
  payload: annotationPayloadSchema,
});

const favoriteOperationSchema = baseOperationSchema.extend({
  entityType: z.literal('favorite'),
  operation: z.enum(['upsert', 'delete']),
  payload: favoritePayloadSchema,
});

export const syncOperationSchema = z
  .discriminatedUnion('entityType', [
    progressOperationSchema,
    annotationOperationSchema,
    favoriteOperationSchema,
  ])
  .superRefine((operation, context) => {
    const payloadEntityId =
      operation.entityType === 'annotation'
        ? operation.payload.annotationId
        : operation.payload.articleSlug;
    if (operation.entityId !== payloadEntityId) {
      context.addIssue({
        code: 'custom',
        path: ['entityId'],
        message: 'entityId must match the payload identity',
      });
    }
    if (
      operation.entityType !== 'progress' &&
      operation.operation === 'delete' &&
      operation.payload.deletedAt === null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['payload', 'deletedAt'],
        message: 'delete operations require a tombstone timestamp',
      });
    }
  });

export const syncBatchRequestSchema = z.object({
  operations: z.array(syncOperationSchema).max(50),
});

export const aggregateProgressSchema = progressPayloadSchema
  .omit({ firstReadAt: true, lastReadAt: true })
  .extend({
    firstReadAt: instantSchema,
    lastReadAt: instantSchema,
  });

export const cloudAnnotationSchema = annotationPayloadSchema.omit({ baseVersion: true }).extend({
  version: z.number().int().positive(),
  serverUpdatedAt: instantSchema,
});

export const cloudFavoriteSchema = favoritePayloadSchema.omit({ baseVersion: true }).extend({
  version: z.number().int().positive(),
  serverUpdatedAt: instantSchema,
});

export const syncBatchResponseSchema = z.object({
  results: z.array(
    z.object({
      operationId: uuidSchema,
      status: z.enum(['applied', 'duplicate', 'conflict']),
    }),
  ),
  progress: z.array(aggregateProgressSchema),
  annotations: z.array(cloudAnnotationSchema),
  favorites: z.array(cloudFavoriteSchema),
  cursor: instantSchema,
});

export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;
export type SyncBatchResponse = z.infer<typeof syncBatchResponseSchema>;
export type ProgressPayload = z.infer<typeof progressPayloadSchema>;
export type AnnotationPayload = z.infer<typeof annotationPayloadSchema>;
export type FavoritePayload = z.infer<typeof favoritePayloadSchema>;
export type AggregateProgress = z.infer<typeof aggregateProgressSchema>;
export type CloudAnnotation = z.infer<typeof cloudAnnotationSchema>;
export type CloudFavorite = z.infer<typeof cloudFavoriteSchema>;
