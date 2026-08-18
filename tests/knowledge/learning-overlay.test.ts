import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLearningOverlay,
  summarizeLearningOverlay,
} from '../../src/lib/knowledge/learning-overlay.ts';
import type { ArticleProgress } from '../../src/lib/learning/types.ts';

function progress(articleSlug: string, overrides: Partial<ArticleProgress> = {}): ArticleProgress {
  return {
    articleSlug,
    title: articleSlug,
    category: '前端',
    readSeconds: 0,
    listenSeconds: 0,
    maxProgress: 0,
    lastProgress: 0,
    lastScrollY: 0,
    firstReadAt: '2026-08-18T10:00:00.000Z',
    lastReadAt: '2026-08-18T10:00:00.000Z',
    annotationCount: 0,
    daily: {},
    ...overrides,
  };
}

test('learning overlay maps existing progress fields without creating new state', () => {
  const overlay = buildLearningOverlay(
    ['not-started', 'reading', 'completed'],
    [
      progress('reading', { readSeconds: 180, maxProgress: 38, annotationCount: 2 }),
      progress('completed', {
        readSeconds: 900,
        maxProgress: 100,
        completedAt: '2026-08-18T11:00:00.000Z',
        annotationCount: 5,
      }),
    ],
  );

  assert.deepEqual(overlay['not-started'], {
    status: 'not-started',
    readSeconds: 0,
    maxProgress: 0,
    annotationCount: 0,
  });
  assert.equal(overlay.reading.status, 'reading');
  assert.equal(overlay.reading.annotationCount, 2);
  assert.equal(overlay.completed.status, 'completed');
});

test('learning overlay ignores records outside the public graph and summarizes local state', () => {
  const overlay = buildLearningOverlay(
    ['reading', 'completed'],
    [
      progress('reading', { readSeconds: 12 }),
      progress('completed', { completedAt: '2026-08-18T11:00:00.000Z' }),
      progress('private-record', { readSeconds: 999 }),
    ],
  );

  assert.deepEqual(Object.keys(overlay), ['completed', 'reading']);
  assert.deepEqual(summarizeLearningOverlay(overlay), { completedCount: 1, readingCount: 1 });
});
