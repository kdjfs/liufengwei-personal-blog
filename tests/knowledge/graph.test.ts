import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKnowledgeGraph, type KnowledgeGraphArticle } from '../../src/lib/knowledge/graph.ts';

function article(
  slug: string,
  overrides: Partial<KnowledgeGraphArticle> = {},
): KnowledgeGraphArticle {
  return {
    slug,
    title: `Article ${slug}`,
    description: `Description for ${slug}`,
    category: '前端',
    tags: ['TypeScript'],
    draft: false,
    ...overrides,
  };
}

test('knowledge graph output is deterministic and excludes drafts', () => {
  const first = article('react-hooks', {
    title: 'React Hooks',
    tags: ['React', 'TypeScript', 'React'],
    series: 'React 学习路径',
    seriesOrder: 2,
  });
  const second = article('react-basics', {
    title: 'React 基础',
    tags: ['React'],
    series: 'React 学习路径',
    seriesOrder: 1,
  });
  const draft = article('private-draft', { draft: true });

  const forward = buildKnowledgeGraph([first, draft, second]);
  const reverse = buildKnowledgeGraph([second, first, draft]);

  assert.deepEqual(forward, reverse);
  assert.equal(
    forward.nodes.some((node) => node.id === 'article:private-draft'),
    false,
  );
  assert.equal(
    forward.nodes.some((node) => node.id === 'series:React%20%E5%AD%A6%E4%B9%A0%E8%B7%AF%E5%BE%84'),
    true,
  );
  assert.equal(
    forward.edges.filter(
      (edge) => edge.source === 'article:react-hooks' && edge.target === 'tag:React',
    ).length,
    1,
  );
});

test('knowledge graph preserves article metadata and navigable taxonomy hrefs', () => {
  const graph = buildKnowledgeGraph([
    article('redis-cache', {
      title: 'Redis 缓存',
      category: '后端',
      tags: ['Redis', '缓存'],
      series: 'MySQL 与 Redis 前端速成',
      seriesOrder: 7,
    }),
  ]);

  const articleNode = graph.nodes.find((node) => node.id === 'article:redis-cache');
  assert.deepEqual(articleNode, {
    id: 'article:redis-cache',
    type: 'article',
    label: 'Redis 缓存',
    slug: 'redis-cache',
    href: '/blog/redis-cache',
    description: 'Description for redis-cache',
    category: '后端',
    tags: ['Redis', '缓存'],
    series: 'MySQL 与 Redis 前端速成',
    seriesOrder: 7,
  });
  assert.equal(
    graph.nodes.find((node) => node.id === 'category:%E5%90%8E%E7%AB%AF')?.href,
    '/categories/%E5%90%8E%E7%AB%AF',
  );
  assert.equal(graph.stats.articleCount, 1);
  assert.equal(graph.stats.edgeCount, 4);
});

test('knowledge graph rejects duplicate articles and invalid metadata', () => {
  assert.throws(
    () => buildKnowledgeGraph([article('same'), article('same', { title: 'Duplicate' })]),
    /Duplicate article slug: same/,
  );
  assert.throws(() => buildKnowledgeGraph([article('../unsafe')]), /Invalid article slug/);
  assert.throws(
    () =>
      buildKnowledgeGraph([
        article('series-without-order', { series: 'Learning Path', seriesOrder: undefined }),
      ]),
    /requires a positive integer seriesOrder/,
  );
});
