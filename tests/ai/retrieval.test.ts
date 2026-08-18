import assert from 'node:assert/strict';
import test from 'node:test';
import {
  rankKnowledge,
  retrieveKnowledge,
  selectKnowledgeSources,
} from '../../src/lib/ai/retrieval.ts';
import type { KnowledgeIndex, KnowledgeItem } from '../../src/lib/ai/types.ts';

const items: KnowledgeItem[] = [
  {
    id: 'article:vue-diff',
    type: 'article',
    title: 'Vue3 Diff 算法与最长递增子序列',
    slug: 'vue3-diff',
    url: '/blog/vue3-diff',
    description: '深入解释 Vue3 keyed children diff。',
    category: '前端',
    tags: ['Vue3', 'Diff'],
    excerpt: '双端比较、最长递增子序列与节点移动。',
  },
  {
    id: 'article:event-loop',
    type: 'article',
    title: 'JavaScript 事件循环',
    slug: 'event-loop',
    url: '/blog/event-loop',
    description: '宏任务、微任务与浏览器事件循环。',
    category: 'JavaScript',
    tags: ['Event Loop', 'Promise'],
    excerpt: 'Promise 回调进入微任务队列。',
  },
  {
    id: 'project:tripstar-ai',
    type: 'project',
    title: '星途智旅 TripStar AI',
    slug: 'tripstar-ai',
    url: '/projects/tripstar-ai',
    description: 'AI 行程生成与地图路线应用。',
    category: 'Projects',
    tags: ['React', 'AI', 'AMap'],
    excerpt: '通过 WebSocket 展示 AI 生成进度。',
  },
];

test('rankKnowledge prioritizes weighted title and tag matches for Chinese queries', () => {
  const ranked = rankKnowledge('请解释 Vue3 Diff 的最长递增子序列', items, 3);
  assert.equal(ranked[0]?.item.id, 'article:vue-diff');
  assert.ok((ranked[0]?.score ?? 0) > (ranked[1]?.score ?? 0));
});

test('rankKnowledge is case-insensitive for English queries', () => {
  const ranked = rankKnowledge('promise EVENT LOOP', items, 2);
  assert.equal(ranked[0]?.item.id, 'article:event-loop');
});

test('rankKnowledge returns only real positive-scoring sources', () => {
  const ranked = rankKnowledge('完全无关的问题', items, 4);
  assert.deepEqual(ranked, []);
});

test('selectKnowledgeSources puts the current article first without duplicating it', () => {
  const selected = selectKnowledgeSources('Promise Event Loop', items, '/blog/vue3-diff', 3);

  assert.equal(selected[0]?.id, 'article:vue-diff');
  assert.equal(selected[1]?.id, 'article:event-loop');
  assert.equal(new Set(selected.map((item) => item.id)).size, selected.length);
});

const backendDocuments = Array.from({ length: 11 }, (_, index) => ({
  id: `article:backend-${index + 1}`,
  type: 'article' as const,
  title: `第${index + 1}章 MySQL 与 Redis ${index + 1}`,
  slug: `backend-${index + 1}`,
  url: `/blog/backend-${index + 1}`,
  description: `后端第 ${index + 1} 章。`,
  category: '后端',
  tags: ['MySQL', 'Redis'],
  excerpt: `第 ${index + 1} 章的摘要。`,
}));

function backendDocument(index: number) {
  const document = backendDocuments[index];
  assert.ok(document);
  return document;
}

const retrievalIndex: KnowledgeIndex = {
  version: 2,
  fingerprint: 'fixture',
  generatedAt: '2026-08-02T00:00:00.000Z',
  stats: { articles: 11, categories: 1, tags: 2, series: 0, chunks: 2 },
  taxonomies: {
    categories: [{ name: '后端', count: 11, articleIds: backendDocuments.map((item) => item.id) }],
    tags: [
      { name: 'MySQL', count: 11, articleIds: backendDocuments.map((item) => item.id) },
      { name: 'Redis', count: 11, articleIds: backendDocuments.map((item) => item.id) },
    ],
    series: [],
  },
  documents: backendDocuments,
  chunks: [
    {
      id: 'article:backend-8#cache-avalanche:1',
      articleId: 'article:backend-8',
      articleTitle: '第8章 缓存穿透、缓存击穿、缓存雪崩',
      articleSlug: 'backend-8',
      url: '/blog/backend-8#cache-avalanche',
      anchor: 'cache-avalanche',
      heading: '缓存雪崩',
      headingPath: ['缓存雪崩'],
      category: '后端',
      tags: ['Redis'],
      order: 1,
      text: 'Redis cache avalanche 缓存雪崩会使大量请求回源。',
    },
    {
      id: 'article:backend-9#big-key:1',
      articleId: 'article:backend-9',
      articleTitle: '第9章 Redis 热 Key 与大 Key',
      articleSlug: 'backend-9',
      url: '/blog/backend-9#big-key',
      anchor: 'big-key',
      heading: '大 Key',
      headingPath: ['大 Key'],
      category: '后端',
      tags: ['Redis'],
      order: 1,
      text: '大 Key 会占用大量内存，导致网络传输、删除与迁移变慢。',
    },
  ],
};

test('retrieveKnowledge answers category counts and complete lists from taxonomy metadata', () => {
  const count = retrieveKnowledge('可以看到我后端分类下有几篇文章吗？', retrievalIndex, '/');
  assert.equal(count.intent, 'metadata_count');
  assert.match(count.fastAnswer ?? '', /11/);

  const list = retrieveKnowledge('把后端分类下的所有文章列出来。', retrievalIndex, '/');
  assert.equal(list.intent, 'metadata_list');
  assert.equal(list.documents.length, 11);
  assert.match(list.fastAnswer ?? '', /第11章/);
});

test('series metadata lists follow seriesOrder even when publish dates and input order disagree', () => {
  const documents = [
    {
      ...backendDocument(2),
      series: 'MySQL 与 Redis 前端速成',
      seriesOrder: 3,
      publishDate: '2026-08-04',
    },
    {
      ...backendDocument(0),
      series: 'MySQL 与 Redis 前端速成',
      seriesOrder: 1,
      publishDate: '2026-08-03',
    },
    {
      ...backendDocument(3),
      series: 'MySQL 与 Redis 前端速成',
      seriesOrder: 4,
      publishDate: '2026-08-01',
    },
    {
      ...backendDocument(1),
      series: 'MySQL 与 Redis 前端速成',
      seriesOrder: 2,
      publishDate: '2026-08-05',
    },
  ];
  const index: KnowledgeIndex = {
    ...retrievalIndex,
    stats: { ...retrievalIndex.stats, articles: 4, series: 1 },
    documents,
    taxonomies: {
      ...retrievalIndex.taxonomies,
      categories: [{ name: '前端', count: 4, articleIds: documents.map((item) => item.id) }],
      series: [
        { name: 'MySQL 与 Redis 前端速成', count: 4, articleIds: documents.map((item) => item.id) },
      ],
    },
  };

  const result = retrieveKnowledge('请按顺序列出 MySQL 与 Redis 前端速成系列全部文章', index, '/');
  assert.equal(result.intent, 'metadata_list');
  assert.equal(result.entities.series, 'MySQL 与 Redis 前端速成');
  assert.equal(result.entities.category, undefined);
  assert.equal(result.entities.tag, undefined);
  assert.match(result.facts ?? '', /MySQL 与 Redis 前端速成系列/);
  assert.deepEqual(
    result.documents.map((item) => item.seriesOrder),
    [1, 2, 3, 4],
  );
  assert.equal(result.chunks.length, 0);
});

test('selection context can enrich semantic ranking without hijacking query intent', () => {
  const result = retrieveKnowledge(
    '请解释我选中的这段内容 所有 MySQL Redis 章节都使用中文注释',
    retrievalIndex,
    '/blog/backend-3',
    { intentQuery: '请解释我选中的这段内容' },
  );

  assert.equal(result.intent, 'content_search');
  assert.equal(result.fastAnswer, undefined);
});

test('retrieveKnowledge finds heading chunks for Chinese and English technical queries', () => {
  const chinese = retrieveKnowledge('大 Key 会带来什么问题？', retrievalIndex, '/');
  assert.equal(chinese.chunks[0]?.heading, '大 Key');
  const english = retrieveKnowledge('which post explains cache avalanche?', retrievalIndex, '/');
  assert.equal(english.chunks[0]?.heading, '缓存雪崩');
});
