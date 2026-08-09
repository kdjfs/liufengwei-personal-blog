import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { LearningDatabase } from '../../src/lib/learning/db.ts';
import { createArticleProgress } from '../../src/lib/learning/reading-tracker.ts';
import type { Annotation, AudioScript, LearningSetting } from '../../src/lib/learning/types.ts';

const migratedProgress = createArticleProgress({
  articleSlug: 'mysql-index',
  title: 'MySQL 索引',
  category: '后端',
  now: '2026-08-03T10:00:00.000Z',
});

const migratedAnnotation: Annotation = {
  id: '8f627421-41f2-497a-a150-c365a5e91382',
  articleSlug: 'mysql-index',
  articleTitle: 'MySQL 索引',
  selectedText: 'B+ Tree',
  note: '索引结构',
  exact: 'B+ Tree',
  prefix: '',
  suffix: '',
  createdAt: '2026-08-03T10:00:00.000Z',
  updatedAt: '2026-08-03T10:00:00.000Z',
};

const migratedAudioScript: AudioScript = {
  cacheKey: 'mysql-index:default',
  articleSlug: 'mysql-index',
  articleTitle: 'MySQL 索引',
  fingerprint: 'content-v1',
  promptVersion: 'v1',
  text: 'audio script',
  createdAt: '2026-08-03T10:00:00.000Z',
  updatedAt: '2026-08-03T10:00:00.000Z',
};

const migratedSetting: LearningSetting = {
  key: 'speech-rate',
  value: 1.5,
  updatedAt: '2026-08-03T10:00:00.000Z',
};

function requestDone(request: IDBRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function createPopulatedV1(factory: IDBFactory, name: string): Promise<void> {
  const request = factory.open(name, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    database.createObjectStore('articleProgress', { keyPath: 'articleSlug' });
    database.createObjectStore('annotations', { keyPath: 'id' });
    database.createObjectStore('audioScripts', { keyPath: 'cacheKey' });
    database.createObjectStore('settings', { keyPath: 'key' });
  };
  await requestDone(request);
  const database = request.result;
  const transaction = database.transaction(
    ['articleProgress', 'annotations', 'audioScripts', 'settings'],
    'readwrite',
  );
  transaction.objectStore('articleProgress').put(migratedProgress);
  transaction.objectStore('annotations').put(migratedAnnotation);
  transaction.objectStore('audioScripts').put(migratedAudioScript);
  transaction.objectStore('settings').put(migratedSetting);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

test('learning database creates the V2 stores and persists structured records', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-learning-test-${Date.now()}`);
  const progress = createArticleProgress({
    articleSlug: 'mysql-index',
    title: 'MySQL 索引',
    category: '后端',
    now: '2026-08-03T10:00:00.000Z',
  });

  await database.put('articleProgress', progress);
  assert.deepEqual(await database.get('articleProgress', 'mysql-index'), progress);
  assert.deepEqual(await database.getAll('articleProgress'), [progress]);

  const stores = await database.getStoreNames();
  assert.deepEqual(stores, [
    'annotations',
    'articleProgress',
    'audioScripts',
    'cloudProgress',
    'favorites',
    'settings',
    'syncMeta',
    'syncQueue',
  ]);
  database.close();
});

test('V2 migration preserves every populated V1 store', async () => {
  const factory = new IDBFactory();
  const name = `lfw-learning-migration-${Date.now()}`;
  await createPopulatedV1(factory, name);

  const database = new LearningDatabase(factory, name);
  assert.deepEqual(
    await database.get('articleProgress', migratedProgress.articleSlug),
    migratedProgress,
  );
  assert.deepEqual(await database.get('annotations', migratedAnnotation.id), migratedAnnotation);
  assert.deepEqual(
    await database.get('audioScripts', migratedAudioScript.cacheKey),
    migratedAudioScript,
  );
  assert.deepEqual(await database.get('settings', migratedSetting.key), migratedSetting);
  database.close();
});

test('device identity is random, persisted, and reused without fingerprinting', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-device-test-${Date.now()}`);
  const expected = '9aa7193d-81d9-41b3-ab83-67216f818922';
  let calls = 0;
  const createId = () => {
    calls += 1;
    return expected;
  };

  assert.equal(await database.getOrCreateDeviceId(createId), expected);
  assert.equal(await database.getOrCreateDeviceId(createId), expected);
  assert.equal(calls, 1);
  assert.equal((await database.get('settings', 'cloud-device-id'))?.value, expected);
  database.close();
});

test('concurrent device identity initialization converges on one stored UUID', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-device-race-${Date.now()}`);
  const firstGenerated = 'a2df2d56-c15e-4bef-862e-6df443a0e2f1';
  const secondGenerated = 'db04c721-c330-4b6c-a8d3-940d3ca11458';

  const identities = await Promise.all([
    database.getOrCreateDeviceId(() => firstGenerated),
    database.getOrCreateDeviceId(() => secondGenerated),
  ]);

  assert.equal(identities[0], identities[1]);
  assert.equal((await database.get('settings', 'cloud-device-id'))?.value, identities[0]);
  database.close();
});

test('local mutation and queue envelope commit atomically', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-queue-test-${Date.now()}`);
  const operation = {
    operationId: '6440793e-4ccd-45ae-b6b7-f9d986f3afd8',
    deviceId: '9aa7193d-81d9-41b3-ab83-67216f818922',
    entityType: 'progress' as const,
    entityId: migratedProgress.articleSlug,
    operation: 'upsert' as const,
    payload: migratedProgress,
    createdAt: '2026-08-03T10:05:00.000Z',
    attempts: 0,
  };

  await database.putAndQueue('articleProgress', migratedProgress, operation);
  assert.deepEqual(
    await database.get('articleProgress', migratedProgress.articleSlug),
    migratedProgress,
  );
  assert.deepEqual(await database.get('syncQueue', operation.operationId), operation);

  await database.acknowledgeOperations([operation.operationId]);
  assert.equal(await database.get('syncQueue', operation.operationId), undefined);
  database.close();
});

test('newer unsent state compacts the queue for the same device entity', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-queue-compact-${Date.now()}`);
  const first = {
    operationId: '6440793e-4ccd-45ae-b6b7-f9d986f3afd8',
    deviceId: '9aa7193d-81d9-41b3-ab83-67216f818922',
    entityType: 'progress' as const,
    entityId: migratedProgress.articleSlug,
    operation: 'upsert' as const,
    payload: migratedProgress,
    createdAt: '2026-08-03T10:05:00.000Z',
    attempts: 0,
  };
  const latest = {
    ...first,
    operationId: '0deac1d2-919d-4810-be4a-3aa573b70d5b',
    payload: { ...migratedProgress, readSeconds: 30 },
    createdAt: '2026-08-03T10:06:00.000Z',
  };

  await database.putAndQueue('articleProgress', migratedProgress, first);
  await database.putAndQueue('articleProgress', latest.payload, latest);

  assert.deepEqual(await database.getAll('syncQueue'), [latest]);
  assert.equal(
    (await database.get('articleProgress', migratedProgress.articleSlug))?.readSeconds,
    30,
  );
  database.close();
});

test('learning database clears one data group without deleting the others', async () => {
  const database = new LearningDatabase(new IDBFactory(), `lfw-learning-clear-${Date.now()}`);
  await database.put('settings', {
    key: 'speech-rate',
    value: 1.5,
    updatedAt: '2026-08-03T10:00:00.000Z',
  });
  await database.put('annotations', {
    id: 'note-1',
    articleSlug: 'mysql-index',
    articleTitle: 'MySQL 索引',
    selectedText: 'B+ Tree',
    note: '索引结构',
    exact: 'B+ Tree',
    prefix: '',
    suffix: '',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-03T10:00:00.000Z',
  });

  await database.clear('annotations');
  assert.deepEqual(await database.getAll('annotations'), []);
  assert.equal((await database.get('settings', 'speech-rate'))?.value, 1.5);
  database.close();
});
