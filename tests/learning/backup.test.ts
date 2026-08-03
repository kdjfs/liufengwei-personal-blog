import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeLearningBackup, parseLearningBackup } from '../../src/lib/learning/backup.ts';
import type { LearningBackup } from '../../src/lib/learning/types.ts';

const validBackup: LearningBackup = {
  format: 'lfw-learning-backup',
  version: 1,
  exportedAt: '2026-08-03T10:00:00.000Z',
  articleProgress: [],
  annotations: [
    {
      id: 'note-1',
      articleSlug: 'mysql-mvcc',
      articleTitle: 'MySQL MVCC',
      selectedText: 'MVCC',
      note: 'Read View 很重要',
      exact: 'MVCC',
      prefix: '',
      suffix: '',
      createdAt: '2026-08-03T09:00:00.000Z',
      updatedAt: '2026-08-03T09:00:00.000Z',
    },
  ],
  settings: [],
};

test('backup import rejects untrusted JSON with an invalid schema', () => {
  assert.throws(() => parseLearningBackup('{"format":"wrong","annotations":"oops"}'));
  assert.throws(() => parseLearningBackup('{bad json'));
});

test('backup import accepts a validated V1 payload', () => {
  assert.deepEqual(parseLearningBackup(JSON.stringify(validBackup)), validBackup);
});

test('backup merge keeps the newest annotation by id and updatedAt', () => {
  const merged = mergeLearningBackup(
    {
      articleProgress: [],
      annotations: [
        { ...validBackup.annotations[0], note: '旧理解', updatedAt: '2026-08-03T08:00:00.000Z' },
      ],
      settings: [],
    },
    validBackup,
  );
  assert.equal(merged.annotations[0]?.note, 'Read View 很重要');
});
