import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { analyzeMarkdown, findContentIssues, parseContentFile, slugify } from './core.mjs';

test('slugify creates readable mixed Chinese and English slugs', () => {
  assert.equal(slugify('Vue3 Diff 算法详解'), 'vue3-diff-suan-fa-xiang-jie');
});

test('analyzeMarkdown extracts H1, images, links and empty alt text', () => {
  const result = analyzeMarkdown(
    '# 标题\n\n![示意图](./demo.png)\n\n![](./empty.png)\n\n[文章](/blog/demo)',
  );
  assert.equal(result.title, '标题');
  assert.deepEqual(result.images, [
    { alt: '示意图', url: './demo.png' },
    { alt: '', url: './empty.png' },
  ]);
  assert.deepEqual(result.links, ['./demo.png', './empty.png', '/blog/demo']);
});

test('parseContentFile prefers frontmatter title over H1', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lfw-content-'));
  const file = path.join(directory, 'post.md');
  await writeFile(file, '---\ntitle: Frontmatter\nslug: frontmatter\n---\n# Heading\n');
  const result = await parseContentFile(file);
  assert.equal(result.data.title, 'Frontmatter');
  assert.equal(result.analysis.title, 'Heading');
});

test('findContentIssues reports duplicate slugs and invalid series order', () => {
  const entries = [
    {
      file: 'a.md',
      data: { slug: 'same', title: 'A', series: 'Series', seriesOrder: 1 },
      analysis: { images: [], links: [] },
    },
    {
      file: 'b.md',
      data: { slug: 'same', title: 'B', series: 'Series' },
      analysis: { images: [], links: [] },
    },
  ];
  const issues = findContentIssues(entries, { contentDirectory: process.cwd() });
  assert.ok(issues.some((issue) => issue.message.includes('重复 slug')));
  assert.ok(issues.some((issue) => issue.message.includes('seriesOrder')));
});
