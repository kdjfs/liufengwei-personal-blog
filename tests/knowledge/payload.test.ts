import assert from 'node:assert/strict';
import test from 'node:test';
import { isKnowledgeGraphPayload } from '../../src/lib/knowledge/payload.ts';

const validGraph = {
  version: 1,
  nodes: [
    {
      id: 'article:redis-cache',
      type: 'article',
      label: 'Redis 缓存',
      slug: 'redis-cache',
      href: '/blog/redis-cache',
      description: 'Redis cache article',
      category: '后端',
      tags: ['Redis'],
    },
    {
      id: 'tag:Redis',
      type: 'tag',
      label: 'Redis',
      href: '/tags/Redis',
    },
  ],
  edges: [
    {
      id: 'tag:article:redis-cache->tag:Redis',
      type: 'tag',
      source: 'article:redis-cache',
      target: 'tag:Redis',
    },
  ],
  stats: {
    articleCount: 1,
    categoryCount: 0,
    tagCount: 1,
    seriesCount: 0,
    edgeCount: 1,
  },
};

test('knowledge payload accepts a complete graph with resolvable edges', () => {
  assert.equal(isKnowledgeGraphPayload(validGraph), true);
});

test('knowledge payload rejects malformed nodes, unsafe hrefs, and dangling edges', () => {
  assert.equal(
    isKnowledgeGraphPayload({ ...validGraph, nodes: [{ id: 42, type: 'article' }] }),
    false,
  );
  assert.equal(
    isKnowledgeGraphPayload({
      ...validGraph,
      nodes: [{ ...validGraph.nodes[0], tags: [] }, validGraph.nodes[1]],
    }),
    false,
  );
  assert.equal(
    isKnowledgeGraphPayload({
      ...validGraph,
      nodes: [{ ...validGraph.nodes[0], href: 'javascript:alert(1)' }, validGraph.nodes[1]],
    }),
    false,
  );
  assert.equal(
    isKnowledgeGraphPayload({
      ...validGraph,
      edges: [{ ...validGraph.edges[0], target: 'tag:missing' }],
    }),
    false,
  );
});

test('knowledge payload rejects duplicate ids and inconsistent statistics', () => {
  assert.equal(
    isKnowledgeGraphPayload({
      ...validGraph,
      nodes: [...validGraph.nodes, validGraph.nodes[0]],
    }),
    false,
  );
  assert.equal(
    isKnowledgeGraphPayload({
      ...validGraph,
      stats: { ...validGraph.stats, articleCount: 99 },
    }),
    false,
  );
});
