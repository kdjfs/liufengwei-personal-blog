import assert from 'node:assert/strict';
import test from 'node:test';
import type { SyncBatchResponse } from '@lfw/contracts/sync';
import { IDBFactory } from 'fake-indexeddb';
import { CloudClient, CloudRequestError } from '../../src/lib/cloud/client.ts';
import { retryDelay, syncPendingOperations } from '../../src/lib/cloud/sync.ts';
import { LearningDatabase } from '../../src/lib/learning/db.ts';
import type { QueuedSyncOperation } from '../../src/lib/learning/types.ts';

const progressOperation: QueuedSyncOperation = {
  operationId: '6440793e-4ccd-45ae-b6b7-f9d986f3afd8',
  deviceId: '9aa7193d-81d9-41b3-ab83-67216f818922',
  entityType: 'progress',
  entityId: 'mysql-index',
  operation: 'upsert',
  payload: {
    articleSlug: 'mysql-index',
    title: 'MySQL Index',
    category: 'Backend',
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
  createdAt: '2026-08-03T10:05:00.000Z',
  attempts: 0,
};

const response: SyncBatchResponse = {
  results: [{ operationId: progressOperation.operationId, status: 'applied' }],
  progress: [
    {
      articleSlug: 'mysql-index',
      title: 'MySQL Index',
      category: 'Backend',
      readSeconds: 180,
      listenSeconds: 25,
      maxProgress: 100,
      lastProgress: 95,
      lastHeadingId: 'latest-heading',
      lastScrollY: 1800,
      firstReadAt: '2026-08-01T09:00:00.000Z',
      lastReadAt: '2026-08-04T10:00:00.000Z',
      completedAt: '2026-08-04T10:00:00.000Z',
    },
  ],
  annotations: [],
  favorites: [],
  cursor: '2026-08-04T10:00:01.000Z',
};

test('retry delay uses capped exponential backoff with jitter', () => {
  assert.equal(
    retryDelay(1, () => 0),
    500,
  );
  assert.equal(
    retryDelay(2, () => 0.5),
    1250,
  );
  assert.equal(
    retryDelay(20, () => 1),
    60_000,
  );
});

test('cloud client uses bounded credentialed requests and classifies retryable status', async () => {
  assert.throws(() => new CloudClient('https://api.example.test/untrusted-path'));
  let observedUrl = '';
  let observedCredentials: RequestCredentials | undefined;
  const client = new CloudClient('https://api.example.test', {
    fetch: (async (input, init) => {
      observedUrl = String(input);
      observedCredentials = init?.credentials;
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch,
    timeoutMs: 100,
  });

  await client.sync([]);
  assert.equal(observedUrl, 'https://api.example.test/api/v1/sync/batch');
  assert.equal(observedCredentials, 'include');

  const unavailable = new CloudClient('https://api.example.test', {
    fetch: (async () => new Response(null, { status: 503 })) as typeof fetch,
  });
  await assert.rejects(
    unavailable.sync([]),
    (error: unknown) => error instanceof CloudRequestError && error.retryable,
  );
});

test('successful sync acknowledges the stable operation and stores cloud aggregate separately', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-cloud-sync-${Date.now()}`);
  await database.put('syncQueue', progressOperation);
  let observedOperationId = '';

  const result = await syncPendingOperations(database, {
    async sync(operations) {
      observedOperationId = operations[0]?.operationId ?? '';
      return response;
    },
  });

  assert.deepEqual(result, { status: 'synced', attempted: 1 });
  assert.equal(observedOperationId, progressOperation.operationId);
  assert.equal(await database.get('syncQueue', progressOperation.operationId), undefined);
  assert.equal((await database.get('cloudProgress', 'mysql-index'))?.readSeconds, 180);
  assert.equal((await database.get('syncMeta', 'last-sync'))?.value, '2026-08-04T10:00:01.000Z');
  database.close();
});

test('retryable failure retains the same operation id and schedules the next attempt', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-cloud-retry-${Date.now()}`);
  await database.put('syncQueue', progressOperation);
  const now = new Date('2026-08-03T10:10:00.000Z');

  const result = await syncPendingOperations(
    database,
    {
      async sync() {
        throw new CloudRequestError('Cloud unavailable', 503, true);
      },
    },
    { now: () => now, random: () => 0 },
  );

  assert.deepEqual(result, { status: 'offline', attempted: 1 });
  const pending = await database.get('syncQueue', progressOperation.operationId);
  assert.equal(pending?.operationId, progressOperation.operationId);
  assert.equal(pending?.attempts, 1);
  assert.equal(pending?.nextAttemptAt, '2026-08-03T10:10:00.500Z');
  database.close();
});

test('authoritative conflict snapshot replaces an acknowledged local annotation', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-cloud-conflict-${Date.now()}`);
  const annotationId = '8f627421-41f2-497a-a150-c365a5e91382';
  const operation: QueuedSyncOperation = {
    ...progressOperation,
    operationId: 'e5568319-bb56-4ed6-a5f3-44a25bc104fa',
    entityType: 'annotation',
    entityId: annotationId,
    payload: {},
  };
  await database.put('annotations', {
    id: annotationId,
    articleSlug: 'mysql-index',
    articleTitle: 'MySQL Index',
    selectedText: 'B+ Tree',
    note: 'stale local note',
    prefix: '',
    exact: 'B+ Tree',
    suffix: '',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-04T10:00:00.000Z',
  });
  await database.put('syncQueue', operation);

  await syncPendingOperations(database, {
    async sync() {
      return {
        results: [{ operationId: operation.operationId, status: 'conflict' }],
        progress: [],
        annotations: [
          {
            annotationId,
            articleSlug: 'mysql-index',
            articleTitle: 'MySQL Index',
            selectedText: 'B+ Tree',
            note: 'authoritative server note',
            quoteExact: 'B+ Tree',
            quotePrefix: '',
            quoteSuffix: '',
            color: 'yellow',
            createdAt: '2026-08-03T10:00:00.000Z',
            sourceUpdatedAt: '2026-08-03T10:05:00.000Z',
            deletedAt: null,
            version: 3,
            serverUpdatedAt: '2026-08-04T10:00:01.000Z',
          },
        ],
        favorites: [],
        cursor: '2026-08-04T10:00:01.000Z',
      };
    },
  });

  const annotation = await database.get('annotations', annotationId);
  assert.equal(annotation?.note, 'authoritative server note');
  assert.equal(annotation?.serverVersion, 3);
  database.close();
});

test('a newer mutation queued during the request is not overwritten by the response', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-cloud-race-${Date.now()}`);
  const annotationId = '8f627421-41f2-497a-a150-c365a5e91382';
  const first: QueuedSyncOperation = {
    ...progressOperation,
    operationId: 'e5568319-bb56-4ed6-a5f3-44a25bc104fa',
    entityType: 'annotation',
    entityId: annotationId,
    payload: {},
  };
  const local = {
    id: annotationId,
    articleSlug: 'mysql-index',
    articleTitle: 'MySQL Index',
    selectedText: 'B+ Tree',
    note: 'first local note',
    prefix: '',
    exact: 'B+ Tree',
    suffix: '',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-04T10:00:00.000Z',
  };
  await database.putAndQueue('annotations', local, first);

  await syncPendingOperations(database, {
    async sync() {
      const latest = {
        ...local,
        note: 'new edit while request is in flight',
        updatedAt: '2026-08-04T10:00:02.000Z',
      };
      await database.putAndQueue('annotations', latest, {
        ...first,
        operationId: '0deac1d2-919d-4810-be4a-3aa573b70d5b',
        createdAt: latest.updatedAt,
      });
      return {
        results: [{ operationId: first.operationId, status: 'applied' }],
        progress: [],
        annotations: [
          {
            annotationId,
            articleSlug: 'mysql-index',
            articleTitle: 'MySQL Index',
            selectedText: 'B+ Tree',
            note: 'older server response',
            quoteExact: 'B+ Tree',
            quotePrefix: '',
            quoteSuffix: '',
            color: 'yellow',
            createdAt: local.createdAt,
            sourceUpdatedAt: local.updatedAt,
            deletedAt: null,
            version: 1,
            serverUpdatedAt: '2026-08-04T10:00:01.000Z',
          },
        ],
        favorites: [],
        cursor: '2026-08-04T10:00:01.000Z',
      };
    },
  });

  assert.equal(
    (await database.get('annotations', annotationId))?.note,
    'new edit while request is in flight',
  );
  assert.equal((await database.getAll('syncQueue')).length, 1);
  database.close();
});
