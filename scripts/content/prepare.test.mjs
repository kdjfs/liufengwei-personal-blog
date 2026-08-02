import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import matter from 'gray-matter';
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
