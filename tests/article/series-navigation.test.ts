import assert from 'node:assert/strict';
import test from 'node:test';
import { getPostNavigation, sortSeriesPosts } from '../../src/utils/series.ts';

const post = (id: string, seriesOrder: number, publishDate: string) =>
  ({
    id,
    data: {
      series: 'Series A',
      seriesOrder,
      publishDate: new Date(publishDate),
    },
  }) as never;

test('sortSeriesPosts follows seriesOrder and ignores publishDate', () => {
  const posts = [
    post('three', 3, '2026-01-01'),
    post('one', 1, '2026-01-03'),
    post('two', 2, '2026-01-02'),
  ];
  assert.deepEqual(
    sortSeriesPosts(posts).map((item) => item.id),
    ['one', 'two', 'three'],
  );
});

test('series articles use the learning path for previous and next navigation', () => {
  const posts = [
    post('three', 3, '2026-01-01'),
    post('one', 1, '2026-01-03'),
    post('two', 2, '2026-01-02'),
  ];
  const navigation = getPostNavigation(posts[2]!, posts);
  assert.equal(navigation.previous?.id, 'one');
  assert.equal(navigation.next?.id, 'three');
  assert.equal(navigation.seriesPosition, 2);
  assert.equal(navigation.seriesTotal, 3);
});
