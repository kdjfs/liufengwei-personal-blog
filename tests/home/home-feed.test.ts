import assert from 'node:assert/strict';
import test from 'node:test';
import { selectHomePosts } from '../../src/utils/home-feed.ts';

interface TestPost {
  id: string;
  data: { featured: boolean };
}

const post = (id: string, featured = false): TestPost => ({
  id,
  data: { featured },
});

test('selectHomePosts places featured posts first without duplicates', () => {
  const posts = [post('latest'), post('featured-a', true), post('older'), post('featured-b', true)];

  assert.deepEqual(
    selectHomePosts(posts, 4).map((item) => item.id),
    ['featured-a', 'featured-b', 'latest', 'older'],
  );
});

test('selectHomePosts respects the homepage limit', () => {
  const posts = [post('a', true), post('b'), post('c'), post('d')];

  assert.deepEqual(
    selectHomePosts(posts, 3).map((item) => item.id),
    ['a', 'b', 'c'],
  );
});
