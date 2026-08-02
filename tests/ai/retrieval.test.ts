import assert from 'node:assert/strict';
import test from 'node:test';
import { rankKnowledge, selectKnowledgeSources } from '../../src/lib/ai/retrieval.ts';
import type { KnowledgeItem } from '../../src/lib/ai/types.ts';

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
