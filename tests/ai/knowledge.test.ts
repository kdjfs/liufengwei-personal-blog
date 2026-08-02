import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createKnowledgeIndex,
  createKnowledgeItems,
  stripMarkdownForKnowledge,
} from '../../src/lib/ai/knowledge.ts';

test('stripMarkdownForKnowledge keeps prose and removes non-knowledge syntax', () => {
  const markdown = `---
title: Hidden frontmatter
---

## Vue Diff

这里是 **有意义的正文**，参考 [最长递增子序列](/blog/lis)。

![架构图](./architecture.png)

\`inlineCode()\`

\`\`\`ts
const huge = 'code block';
\`\`\`

<aside>HTML wrapper</aside>
`;

  const excerpt = stripMarkdownForKnowledge(markdown, 800);

  assert.match(excerpt, /Vue Diff/);
  assert.match(excerpt, /有意义的正文/);
  assert.match(excerpt, /最长递增子序列/);
  assert.doesNotMatch(excerpt, /Hidden frontmatter|architecture\.png|huge|<aside>|\*\*/);
});

test('createKnowledgeItems only indexes published content and public profile fields', () => {
  const items = createKnowledgeItems({
    posts: [
      {
        id: 'published.md',
        body: '## 正文\n\nVue 响应式系统。',
        data: {
          slug: 'vue-reactivity',
          title: 'Vue 响应式原理',
          description: '解释 Vue 响应式系统的公开文章。',
          category: '前端',
          tags: ['Vue', 'JavaScript'],
          draft: false,
        },
      },
      {
        id: 'private-draft.md',
        body: '私人 TODO',
        data: {
          slug: 'private-draft',
          title: '未发布草稿',
          description: '这是一篇不应进入知识库的草稿。',
          category: '笔记',
          tags: ['Draft'],
          draft: true,
        },
      },
    ],
    profile: {
      name: '刘凤伟',
      role: '前端开发 / AI Agent 应用开发',
      school: '广东金融学院',
      major: '数学与应用数学',
      graduation: 2027,
      bio: '关注前端与 AI Agent 应用。',
      experiences: [],
      techFocus: { Frontend: ['Vue 3'], AI: ['AI Agent 应用'] },
      awards: ['公开奖项'],
      socials: [{ label: 'Email', href: 'mailto:private@example.com' }],
    },
    projects: [],
    timeline: [],
  });

  const serialized = JSON.stringify(items);
  assert.ok(items.some((item) => item.id === 'article:vue-reactivity'));
  assert.ok(items.some((item) => item.id === 'profile:liufengwei'));
  assert.doesNotMatch(serialized, /未发布草稿|私人 TODO|private@example\.com|private-draft\.md/);
});

test('knowledge excerpts remove private contact and local-machine traces', () => {
  const excerpt = stripMarkdownForKnowledge(
    '联系邮箱 private@example.com，手机号 13800138000，微信：private_wechat。路径 D:\\workspace\\private。',
    800,
  );

  assert.doesNotMatch(excerpt, /private@example\.com|13800138000|private_wechat|D:\\workspace/);
});

test('createKnowledgeIndex separates published document metadata, taxonomies, and heading chunks', () => {
  const index = createKnowledgeIndex({
    posts: [
      {
        id: 'redis.md',
        body: `# Redis overview

## 大 Key

大 Key 会占用大量内存，也可能让删除和迁移变慢。它会拖慢网络传输、释放内存与集群迁移，
因此应按业务维度拆分数据并避免一次读取完整集合。

\`\`\`redis
UNLINK large:key
\`\`\`

## 热 Key

热 Key 会使单节点压力集中。`,
        data: {
          slug: 'redis-keys',
          title: 'Redis 热 Key 与大 Key',
          description: '解释 Redis 热点与大对象的风险。',
          category: '后端',
          tags: ['Redis'],
          publishDate: new Date('2026-08-01T00:00:00Z'),
          draft: false,
        },
      },
      {
        id: 'draft.md',
        body: '不应发布',
        data: {
          slug: 'draft',
          title: '草稿',
          description: '不应进入索引的草稿。',
          category: '后端',
          tags: ['Redis'],
          publishDate: new Date('2026-08-02T00:00:00Z'),
          draft: true,
        },
      },
    ],
    profile: {
      name: '刘凤伟',
      role: '开发者',
      school: '学校',
      major: '专业',
      graduation: 2027,
      bio: '简介',
      experiences: [],
      techFocus: {},
      awards: [],
    },
    projects: [],
    timeline: [],
  });

  assert.equal(index.version, 2);
  assert.equal(index.stats.articles, 1);
  assert.equal(index.taxonomies.categories[0]?.name, '后端');
  assert.equal(index.taxonomies.categories[0]?.count, 1);
  assert.equal(index.documents[0]?.publishDate, '2026-08-01T00:00:00.000Z');
  assert.ok(index.chunks.some((chunk) => chunk.heading === '大 Key'));
  assert.ok(index.chunks.some((chunk) => /UNLINK/.test(chunk.text)));
  assert.ok(index.chunks.some((chunk) => chunk.url.endsWith('#大-key')));
});

test('knowledge fingerprints change whenever published content changes', () => {
  const source = {
    posts: [
      {
        id: 'one.md',
        body: '## One\n\nFirst version.',
        data: {
          slug: 'one',
          title: 'One',
          description: 'A published article.',
          category: '笔记',
          tags: ['Test'],
          publishDate: new Date('2026-01-01T00:00:00Z'),
          draft: false,
        },
      },
    ],
    profile: {
      name: 'LFW',
      role: '开发者',
      school: '学校',
      major: '专业',
      graduation: 2027,
      bio: '简介',
      experiences: [],
      techFocus: {},
      awards: [],
    },
    projects: [],
    timeline: [],
  };

  const first = createKnowledgeIndex(source);
  const second = createKnowledgeIndex({
    ...source,
    posts: [{ ...source.posts[0], body: '## One\n\nChanged version.' }],
  });

  assert.notEqual(first.fingerprint, second.fingerprint);
});
