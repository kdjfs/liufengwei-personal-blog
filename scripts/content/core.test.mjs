import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  analyzeMarkdown,
  createArticleBody,
  findContentIssues,
  parseContentFile,
  slugify,
} from './core.mjs';

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

test('findContentIssues rejects duplicate and partial series orders without requiring continuity', () => {
  const entry = (file, title, seriesOrder) => ({
    file,
    body: '正文',
    data: {
      slug: file.replace('.md', ''),
      title,
      description: '这是一段长度足够的系列文章摘要。',
      publishDate: '2026-08-02',
      category: '后端',
      tags: ['MySQL'],
      cover: 'auto',
      draft: false,
      series: 'Series A',
      ...(seriesOrder === undefined ? {} : { seriesOrder }),
    },
    analysis: { title: undefined, images: [], links: [] },
  });
  const issues = findContentIssues(
    [
      entry('one.md', 'One', 10),
      entry('two.md', 'Two', 20),
      entry('duplicate.md', 'Duplicate', 20),
      entry('missing.md', 'Missing'),
    ],
    { contentDirectory: process.cwd() },
  );

  assert.ok(issues.some((issue) => issue.message.includes('Duplicate seriesOrder: 20')));
  assert.ok(issues.some((issue) => issue.message.includes('Missing seriesOrder')));
  assert.ok(!issues.some((issue) => issue.message.includes('连续')));
});

test('findContentIssues rejects TODO markers in published articles', () => {
  const entries = [
    {
      file: 'published.md',
      body: '## 正文\n\n这里仍有 TODO 需要处理。',
      data: {
        slug: 'published',
        title: '正式文章',
        description: '这是一段长度足够的正式文章摘要。',
        publishDate: '2026-08-02',
        category: '工程化',
        tags: ['内容'],
        draft: false,
      },
      analysis: { title: undefined, images: [], links: [] },
    },
  ];

  const issues = findContentIssues(entries, { contentDirectory: process.cwd() });
  assert.ok(issues.some((issue) => issue.message.includes('TODO')));
});

test('findContentIssues rejects an H1 that duplicates the frontmatter title', () => {
  const entries = [
    {
      file: 'duplicate-heading.md',
      body: '# Vue3 Diff 算法详解\n',
      data: {
        slug: 'vue3-diff',
        title: 'Vue3 Diff 算法详解',
        description: '这是一段长度足够的正式文章摘要。',
        publishDate: '2026-08-02',
        category: 'Vue',
        tags: ['Vue3'],
        draft: false,
      },
      analysis: { title: 'Vue3 Diff 算法详解', images: [], links: [] },
    },
  ];

  const issues = findContentIssues(entries, { contentDirectory: process.cwd() });
  assert.ok(issues.some((issue) => issue.message.includes('重复 H1')));
});

test('createArticleBody starts from H2 without publishing TODO markers', () => {
  const body = createArticleBody();
  assert.match(body, /^\n## 开始写作/m);
  assert.doesNotMatch(body, /^#\s/m);
  assert.doesNotMatch(body, /TODO/i);
});

test('findContentIssues rejects covers outside the managed cover pool', () => {
  const entries = [
    {
      file: 'invalid-cover.md',
      body: '## Content\n',
      data: {
        slug: 'invalid-cover',
        title: 'Invalid cover',
        description: 'A sufficiently long article description.',
        publishDate: '2026-08-02',
        category: 'Notes',
        tags: ['Notes'],
        cover: 'cover-grid',
        draft: false,
      },
      analysis: { title: undefined, images: [], links: [] },
    },
  ];

  const issues = findContentIssues(entries, { contentDirectory: process.cwd() });
  assert.ok(issues.some((issue) => issue.message.includes('cover')));
});
