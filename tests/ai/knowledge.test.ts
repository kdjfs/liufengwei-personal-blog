import assert from 'node:assert/strict';
import test from 'node:test';
import {
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
