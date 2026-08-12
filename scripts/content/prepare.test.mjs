import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import matter from 'gray-matter';
import { parseChapterOrder } from './chapter-order.mjs';
import { prepareMarkdownDocument } from './prepare.mjs';

const contentDirectory = path.resolve('src/content/blog');

test('prepare fills frontmatter from a raw markdown file and its category folder', () => {
  const file = path.join(contentDirectory, '面经', '腾讯前端一面.md');
  const raw =
    '# 腾讯前端一面\n\n记录一次前端面试中的浏览器、Vue 和 JavaScript 问题。\n\n## 浏览器\n';
  const result = prepareMarkdownDocument(raw, {
    file,
    contentDirectory,
    today: '2026-08-02',
  });
  const parsed = matter(result.output);

  assert.equal(parsed.data.title, '腾讯前端一面');
  assert.equal(parsed.data.slug, 'teng-xun-qian-duan-yi-mian');
  assert.equal(parsed.data.category, '面经');
  assert.equal(parsed.data.publishDate, '2026-08-02');
  assert.equal(parsed.data.cover, 'auto');
  assert.equal(parsed.data.draft, false);
  assert.equal(parsed.data.featured, false);
  assert.equal(parsed.data.toc, true);
  assert.ok(parsed.data.tags.includes('Vue'));
  assert.ok(parsed.data.tags.includes('JavaScript'));
  assert.doesNotMatch(parsed.content, /^# 腾讯前端一面$/m);
  assert.match(parsed.content, /^## 浏览器$/m);
});

test('prepare preserves existing metadata, code and non-duplicate headings', () => {
  const file = path.join(contentDirectory, '前端', 'existing.md');
  const raw = `---
title: Existing title
slug: existing-title
description: Existing description stays unchanged.
publishDate: '2025-01-02'
category: 前端
tags:
  - TypeScript
cover: 7.jpg
draft: true
featured: true
toc: false
---
# Different heading

\`\`\`ts
const value = '# Existing title';
\`\`\`
`;
  const result = prepareMarkdownDocument(raw, {
    file,
    contentDirectory,
    today: '2026-08-02',
  });
  const parsed = matter(result.output);

  assert.equal(parsed.data.publishDate, '2025-01-02');
  assert.equal(parsed.data.cover, '7.jpg');
  assert.equal(parsed.data.draft, true);
  assert.equal(parsed.data.featured, true);
  assert.equal(parsed.data.toc, false);
  assert.match(parsed.content, /^# Different heading$/m);
  assert.match(parsed.content, /const value = '# Existing title';/);
});

test('prepare is idempotent after generated values are written', () => {
  const file = path.join(contentDirectory, '笔记', '浏览器缓存.md');
  const first = prepareMarkdownDocument('浏览器缓存是前端性能优化中的重要基础。\n', {
    file,
    contentDirectory,
    today: '2026-08-02',
  });
  const second = prepareMarkdownDocument(first.output, {
    file,
    contentDirectory,
    today: '2026-08-03',
  });

  assert.equal(second.output, first.output);
  assert.equal(second.changed, false);
});

test('parseChapterOrder supports safe Chinese and Arabic chapter markers', () => {
  const cases = [
    ['第一章 MySQL', 1],
    ['第十一章：最终复习', 11],
    ['第二十章 缓存', 20],
    ['第二十一篇 补充', 21],
    ['第九十九节 总结', 99],
    ['第1章 MySQL', 1],
    ['第10章 Redis', 10],
  ];
  for (const [title, expected] of cases) assert.equal(parseChapterOrder(title), expected);
  assert.equal(parseChapterOrder('MySQL 第一性原理'), undefined);
  assert.equal(parseChapterOrder('第一章和第二章对比'), undefined);
  assert.equal(parseChapterOrder('第一百章 超出范围'), undefined);
});

test('prepare infers seriesOrder only when series is already explicit', () => {
  const file = path.join(contentDirectory, '后端', '第七章.md');
  const withSeries = prepareMarkdownDocument(
    `---\ntitle: 第七章 Redis 缓存\nseries: MySQL 与 Redis 前端速成\n---\n正文内容足够用于测试。\n`,
    { file, contentDirectory, today: '2026-08-02' },
  );
  const withoutSeries = prepareMarkdownDocument(
    `---\ntitle: 第一章 Node.js\n---\n正文内容足够用于测试。\n`,
    { file, contentDirectory, today: '2026-08-02' },
  );

  assert.equal(matter(withSeries.output).data.seriesOrder, 7);
  assert.equal(matter(withoutSeries.output).data.series, undefined);
  assert.equal(matter(withoutSeries.output).data.seriesOrder, undefined);
});
