import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLearningTick,
  createArticleProgress,
  getArticleScrollProgress,
  isReadingActive,
} from '../../src/lib/learning/reading-tracker.ts';

test('reading is active only when visible, focused, and active in the last 60 seconds', () => {
  const now = 100_000;
  assert.equal(
    isReadingActive({ now, lastActivityAt: now - 59_999, visible: true, focused: true }),
    true,
  );
  assert.equal(
    isReadingActive({ now, lastActivityAt: now - 60_001, visible: true, focused: true }),
    false,
  );
  assert.equal(isReadingActive({ now, lastActivityAt: now, visible: false, focused: true }), false);
  assert.equal(isReadingActive({ now, lastActivityAt: now, visible: true, focused: false }), false);
});

test('article progress uses only the article prose scroll range', () => {
  assert.equal(
    getArticleScrollProgress({
      viewportTop: 100,
      articleTop: 100,
      articleHeight: 1000,
      viewportHeight: 500,
    }),
    0,
  );
  assert.equal(
    getArticleScrollProgress({
      viewportTop: 350,
      articleTop: 100,
      articleHeight: 1000,
      viewportHeight: 500,
    }),
    50,
  );
  assert.equal(
    getArticleScrollProgress({
      viewportTop: 800,
      articleTop: 100,
      articleHeight: 1000,
      viewportHeight: 500,
    }),
    100,
  );
});

test('ticks keep read and listen time separate and preserve maximum progress', () => {
  const initial = createArticleProgress({
    articleSlug: 'mysql-mvcc',
    title: 'MySQL MVCC',
    category: '后端',
    now: '2026-08-03T10:00:00.000Z',
  });
  const read = applyLearningTick(initial, {
    seconds: 5,
    readActive: true,
    listenActive: false,
    progress: 67,
    headingId: 'mvcc',
    scrollY: 640,
    now: '2026-08-03T10:00:05.000Z',
  });
  const listened = applyLearningTick(read, {
    seconds: 5,
    readActive: false,
    listenActive: true,
    progress: 20,
    headingId: 'intro',
    scrollY: 120,
    now: '2026-08-03T10:00:10.000Z',
  });

  assert.equal(listened.readSeconds, 5);
  assert.equal(listened.listenSeconds, 5);
  assert.equal(listened.maxProgress, 67);
  assert.equal(listened.lastProgress, 20);
  assert.equal(listened.completedAt, undefined);
  assert.deepEqual(listened.daily['2026-08-03'], { readSeconds: 5, listenSeconds: 5 });
});

test('an article is completed at 90 percent maximum progress', () => {
  const initial = createArticleProgress({
    articleSlug: 'redis',
    title: 'Redis',
    category: '后端',
    now: '2026-08-03T10:00:00.000Z',
  });
  const completed = applyLearningTick(initial, {
    seconds: 5,
    readActive: true,
    listenActive: false,
    progress: 91,
    headingId: 'summary',
    scrollY: 900,
    now: '2026-08-03T10:00:05.000Z',
  });
  assert.equal(completed.completedAt, '2026-08-03T10:00:05.000Z');
});
