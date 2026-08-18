import assert from 'node:assert/strict';
import test from 'node:test';
import type { KnowledgeGraph } from '../../src/lib/knowledge/graph.ts';
import { filterKnowledgeGraph, layoutKnowledgeNodes } from '../../src/lib/knowledge/view.ts';

const graph: KnowledgeGraph = {
  version: 1,
  nodes: [
    {
      id: 'article:redis-cache',
      type: 'article',
      label: 'Redis 缓存',
      href: '/blog/redis-cache',
      category: '后端',
      tags: ['Redis', '缓存'],
    },
    {
      id: 'article:react-hooks',
      type: 'article',
      label: 'React Hooks',
      href: '/blog/react-hooks',
      category: '前端',
      tags: ['React'],
    },
    {
      id: 'category:%E5%90%8E%E7%AB%AF',
      type: 'category',
      label: '后端',
      href: '/categories/后端',
    },
    {
      id: 'category:%E5%89%8D%E7%AB%AF',
      type: 'category',
      label: '前端',
      href: '/categories/前端',
    },
    { id: 'tag:Redis', type: 'tag', label: 'Redis', href: '/tags/Redis' },
    { id: 'tag:React', type: 'tag', label: 'React', href: '/tags/React' },
  ],
  edges: [
    {
      id: 'category:article:redis-cache->category:backend',
      type: 'category',
      source: 'article:redis-cache',
      target: 'category:%E5%90%8E%E7%AB%AF',
    },
    {
      id: 'tag:article:redis-cache->tag:Redis',
      type: 'tag',
      source: 'article:redis-cache',
      target: 'tag:Redis',
    },
    {
      id: 'category:article:react-hooks->category:frontend',
      type: 'category',
      source: 'article:react-hooks',
      target: 'category:%E5%89%8D%E7%AB%AF',
    },
    {
      id: 'tag:article:react-hooks->tag:React',
      type: 'tag',
      source: 'article:react-hooks',
      target: 'tag:React',
    },
  ],
  stats: { articleCount: 2, categoryCount: 2, tagCount: 2, seriesCount: 0, edgeCount: 4 },
};

test('knowledge layout is deterministic regardless of input order', () => {
  const forward = layoutKnowledgeNodes(graph.nodes);
  const reverse = layoutKnowledgeNodes([...graph.nodes].reverse());

  assert.deepEqual(forward, reverse);
  for (const node of forward) {
    assert.ok(node.x >= 0 && node.x <= 1200);
    assert.ok(node.y >= 0 && node.y <= 760);
  }
});

test('knowledge view searches Chinese and English labels while preserving type filters', () => {
  const redis = filterKnowledgeGraph(graph, { query: 'redis', filter: 'all' });
  assert.deepEqual(redis.matchedNodeIds, ['article:redis-cache', 'tag:Redis']);

  const backendArticles = filterKnowledgeGraph(graph, { query: '缓存', filter: 'article' });
  assert.deepEqual(
    backendArticles.visibleNodes.map((node) => node.id),
    ['article:react-hooks', 'article:redis-cache'],
  );
  assert.deepEqual(backendArticles.matchedNodeIds, ['article:redis-cache']);
});

test('knowledge view can focus on the selected node and its one-degree relationships', () => {
  const focused = filterKnowledgeGraph(graph, {
    query: '',
    filter: 'all',
    selectedId: 'article:redis-cache',
    neighborhoodOnly: true,
  });

  assert.deepEqual(
    focused.visibleNodes.map((node) => node.id),
    ['article:redis-cache', 'category:%E5%90%8E%E7%AB%AF', 'tag:Redis'],
  );
  assert.equal(focused.visibleEdges.length, 2);
  assert.deepEqual(focused.relatedNodeIds, ['category:%E5%90%8E%E7%AB%AF', 'tag:Redis']);
});
