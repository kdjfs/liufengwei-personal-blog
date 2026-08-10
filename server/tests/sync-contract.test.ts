import assert from 'node:assert/strict';
import test from 'node:test';
import { syncBatchRequestSchema } from '@lfw/contracts/sync';

const operationBase = {
  operationId: '6440793e-4ccd-45ae-b6b7-f9d986f3afd8',
  deviceId: '9aa7193d-81d9-41b3-ab83-67216f818922',
  entityId: 'mysql-index',
  createdAt: '2026-08-03T10:05:00.000Z',
};

test('sync contract accepts bounded progress, annotation, and favorite mutations', () => {
  const result = syncBatchRequestSchema.parse({
    operations: [
      {
        ...operationBase,
        entityType: 'progress',
        operation: 'upsert',
        payload: {
          articleSlug: 'mysql-index',
          title: 'MySQL 索引',
          category: '后端',
          readSeconds: 100,
          listenSeconds: 20,
          maxProgress: 80,
          lastProgress: 75,
          lastHeadingId: 'covering-index',
          lastScrollY: 1200,
          firstReadAt: '2026-08-01T09:00:00.000Z',
          lastReadAt: '2026-08-03T10:00:00.000Z',
          completedAt: null,
        },
      },
      {
        ...operationBase,
        operationId: 'e5568319-bb56-4ed6-a5f3-44a25bc104fa',
        entityType: 'annotation',
        entityId: '8f627421-41f2-497a-a150-c365a5e91382',
        operation: 'upsert',
        payload: {
          annotationId: '8f627421-41f2-497a-a150-c365a5e91382',
          articleSlug: 'mysql-index',
          articleTitle: 'MySQL 索引',
          selectedText: 'B+ Tree',
          note: "'; drop table annotations; --",
          quoteExact: 'B+ Tree',
          quotePrefix: '',
          quoteSuffix: '',
          color: 'yellow',
          createdAt: '2026-08-03T10:00:00.000Z',
          sourceUpdatedAt: '2026-08-03T10:05:00.000Z',
          baseVersion: null,
          deletedAt: null,
        },
      },
      {
        ...operationBase,
        operationId: '0deac1d2-919d-4810-be4a-3aa573b70d5b',
        entityType: 'favorite',
        operation: 'upsert',
        payload: {
          articleSlug: 'mysql-index',
          sourceUpdatedAt: '2026-08-03T10:05:00.000Z',
          baseVersion: null,
          deletedAt: null,
        },
      },
    ],
  });

  assert.equal(result.operations.length, 3);
});

test('sync contract rejects invalid identifiers, counters, and oversized batches', () => {
  const invalid = {
    ...operationBase,
    operationId: 'not-a-uuid',
    deviceId: 'fingerprint-value',
    entityType: 'progress',
    operation: 'upsert',
    payload: {
      articleSlug: 'mysql-index',
      title: 'MySQL 索引',
      category: '后端',
      readSeconds: -1,
      listenSeconds: 0,
      maxProgress: 101,
      lastProgress: 0,
      lastScrollY: 0,
      firstReadAt: 'not-a-date',
      lastReadAt: '2026-08-03T10:00:00.000Z',
      completedAt: null,
    },
  };

  assert.equal(syncBatchRequestSchema.safeParse({ operations: [invalid] }).success, false);
  assert.equal(
    syncBatchRequestSchema.safeParse({ operations: Array.from({ length: 51 }, () => invalid) })
      .success,
    false,
  );
});
