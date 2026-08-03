import assert from 'node:assert/strict';
import test from 'node:test';
import { createArticleProgress } from '../../src/lib/learning/reading-tracker.ts';
import { summarizeLearning } from '../../src/lib/learning/stats.ts';

test('learning summary derives totals, completion, today, seven days, and categories from real records', () => {
  const first = {
    ...createArticleProgress({
      articleSlug: 'mysql',
      title: 'MySQL',
      category: '后端',
      now: '2026-08-01T10:00:00.000Z',
    }),
    readSeconds: 600,
    listenSeconds: 300,
    maxProgress: 92,
    completedAt: '2026-08-03T10:00:00.000Z',
    lastReadAt: '2026-08-03T10:00:00.000Z',
    daily: { '2026-08-03': { readSeconds: 120, listenSeconds: 60 } },
  };
  const second = {
    ...createArticleProgress({
      articleSlug: 'vue',
      title: 'Vue',
      category: '前端',
      now: '2026-08-02T10:00:00.000Z',
    }),
    readSeconds: 300,
    listenSeconds: 0,
    lastReadAt: '2026-08-02T10:00:00.000Z',
    daily: { '2026-08-02': { readSeconds: 300, listenSeconds: 0 } },
  };
  const summary = summarizeLearning([first, second], 3, new Date('2026-08-03T12:00:00+08:00'));

  assert.equal(summary.totalReadSeconds, 900);
  assert.equal(summary.totalListenSeconds, 300);
  assert.equal(summary.todaySeconds, 180);
  assert.equal(summary.articleCount, 2);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.annotationCount, 3);
  assert.deepEqual(summary.byCategory, [
    { category: '后端', seconds: 900 },
    { category: '前端', seconds: 300 },
  ]);
  assert.equal(summary.recent[0]?.articleSlug, 'mysql');
  assert.equal(summary.last7Days.length, 7);
});
