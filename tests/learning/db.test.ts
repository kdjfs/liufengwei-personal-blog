import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { LearningDatabase } from '../../src/lib/learning/db.ts';
import { createArticleProgress } from '../../src/lib/learning/reading-tracker.ts';

test('learning database creates the V1 stores and persists structured records', async () => {
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
  assert.deepEqual(stores, ['annotations', 'articleProgress', 'audioScripts', 'settings']);
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
