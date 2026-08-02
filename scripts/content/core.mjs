import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { pinyin } from 'pinyin-pro';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export const BLOG_DIRECTORY = path.resolve('src/content/blog');
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CONTENT_EXTENSIONS = new Set(['.md', '.mdx']);
export const IMPORT_EXTENSIONS = new Set(['.md', '.mdx', '.txt']);
export const COVER_PATTERN = /^(?:auto|(?:[1-9]|1[0-4])\.jpg|15\.png)$/;

export function createArticleBody() {
  return '\n## 开始写作\n\n<!-- 发布前请完成正文并删除本提示。 -->\n';
}

export function slugify(value) {
  const transliterated = pinyin(value.normalize('NFKC'), {
    toneType: 'none',
    nonZh: 'consecutive',
    v: true,
  });

  return transliterated
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nodeText(node) {
  if (typeof node?.value === 'string') return node.value;
  if (!Array.isArray(node?.children)) return '';
  return node.children.map(nodeText).join('');
}

export function analyzeMarkdown(markdown) {
  const tree = unified().use(remarkParse).parse(markdown);
  const images = [];
  const links = [];
  let title;
  let description;

  visit(tree, (node) => {
    if (!title && node.type === 'heading' && node.depth === 1) title = nodeText(node).trim();
    if (!description && node.type === 'paragraph') {
      const text = nodeText(node).replace(/\s+/g, ' ').trim();
      if (text.length >= 20) description = text.slice(0, 220);
    }
    if (node.type === 'image') {
      images.push({ alt: node.alt ?? '', url: node.url });
      links.push(node.url);
    }
    if (node.type === 'link') links.push(node.url);
  });

  return { title, description, images, links };
}

export async function parseContentFile(file) {
  const raw = await readFile(file, 'utf8');
  const parsed = matter(raw);
  return {
    file: path.resolve(file),
    raw,
    body: parsed.content,
    data: parsed.data,
    analysis: analyzeMarkdown(parsed.content),
  };
}

export async function scanFiles(directory, extensions = CONTENT_EXTENSIONS) {
  const root = path.resolve(directory);
  const files = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    const children = await readdir(current, { withFileTypes: true });
    for (const child of children) {
      const target = path.join(current, child.name);
      if (child.isDirectory()) queue.push(target);
      else if (child.isFile() && extensions.has(path.extname(child.name).toLowerCase())) {
        files.push(target);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export async function loadContentEntries(directory = BLOG_DIRECTORY) {
  const entries = [];
  const parseIssues = [];
  for (const file of await scanFiles(directory)) {
    try {
      entries.push(await parseContentFile(file));
    } catch (error) {
      parseIssues.push({
        level: 'error',
        file,
        message: `Frontmatter 无法解析：${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return { entries, parseIssues };
}

function dateIsValid(value) {
  return value instanceof Date
    ? !Number.isNaN(value.getTime())
    : typeof value === 'string' || typeof value === 'number'
      ? !Number.isNaN(new Date(value).getTime())
      : false;
}

function localTarget(entry, url) {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!clean || clean.startsWith('#')) return undefined;
  if (/^(https?:|mailto:|tel:|data:)/i.test(clean)) return undefined;
  if (clean.startsWith('/')) return path.resolve('public', clean.slice(1));
  return path.resolve(path.dirname(entry.file), clean);
}

export function findContentIssues(entries, { contentDirectory = BLOG_DIRECTORY } = {}) {
  const issues = [];
  const slugs = new Map();
  const titles = new Map();
  const seriesOrders = new Map();
  const knownSlugs = new Set(entries.map((entry) => entry.data.slug).filter(Boolean));

  const report = (level, entry, message) =>
    issues.push({ level, file: path.relative(contentDirectory, entry.file), message });

  for (const entry of entries) {
    const data = entry.data;
    if (!data.slug || !SLUG_PATTERN.test(data.slug)) {
      report('error', entry, 'slug 缺失或不是 lowercase URL-safe 格式');
    } else if (slugs.has(data.slug.toLowerCase())) {
      report('error', entry, `重复 slug：${data.slug}`);
    } else slugs.set(data.slug.toLowerCase(), entry.file);

    if (typeof data.title !== 'string' || data.title.trim().length < 2) {
      report('error', entry, 'title 缺失或过短');
    } else if (titles.has(data.title.trim().toLowerCase())) {
      report('error', entry, `重复 title：${data.title}`);
    } else titles.set(data.title.trim().toLowerCase(), entry.file);

    if (typeof data.description !== 'string' || data.description.trim().length < 10) {
      report('error', entry, 'description 缺失或少于 10 个字符');
    }
    if (!dateIsValid(data.publishDate)) report('error', entry, 'publishDate 非法或缺失');
    if (data.updatedDate && !dateIsValid(data.updatedDate)) {
      report('error', entry, 'updatedDate 日期非法');
    }
    if (data.updatedDate && dateIsValid(data.publishDate)) {
      if (new Date(data.updatedDate) < new Date(data.publishDate)) {
        report('error', entry, 'updatedDate 不能早于 publishDate');
      }
    }
    if (!data.category || !Array.isArray(data.tags) || data.tags.length === 0) {
      report('error', entry, 'category 和 tags 必须完整');
    }
    if (!COVER_PATTERN.test(String(data.cover ?? ''))) {
      report('error', entry, 'cover 必须是 auto、1.jpg 至 14.jpg，或 15.png');
    }
    if (data.draft === false && /\bTODO\b/i.test(entry.body ?? '')) {
      report('error', entry, '正式文章正文不能包含 TODO 标记');
    }
    if (
      typeof data.title === 'string' &&
      entry.analysis.title?.trim().toLowerCase() === data.title.trim().toLowerCase()
    ) {
      report('error', entry, '重复 H1：正文 H1 与 frontmatter title 相同');
    }
    if (data.series && !Number.isInteger(data.seriesOrder)) {
      report('error', entry, '设置 series 时必须提供正整数 seriesOrder');
    }
    if (!data.series && data.seriesOrder !== undefined) {
      report('error', entry, 'seriesOrder 不能脱离 series 单独存在');
    }
    if (data.series && Number.isInteger(data.seriesOrder)) {
      const key = `${data.series.toLowerCase()}::${data.seriesOrder}`;
      if (seriesOrders.has(key))
        report('error', entry, `Series 顺序重复：${data.series} #${data.seriesOrder}`);
      else seriesOrders.set(key, entry.file);
    }

    for (const image of entry.analysis.images) {
      if (!image.alt.trim()) report('error', entry, `图片 alt 为空：${image.url}`);
      const target = localTarget(entry, image.url);
      if (target && !existsSync(target)) report('error', entry, `图片不存在：${image.url}`);
    }

    for (const url of entry.analysis.links) {
      const clean = decodeURIComponent(url.split(/[?#]/)[0]);
      if (clean.startsWith('/blog/')) {
        const slug = clean.replace(/^\/blog\//, '').replace(/\/$/, '');
        if (slug && !knownSlugs.has(slug)) report('error', entry, `内部文章链接失效：${url}`);
        continue;
      }
      const target = localTarget(entry, url);
      if (target && !existsSync(target)) report('error', entry, `本地链接失效：${url}`);
    }
  }

  return issues;
}

export function countWords(markdown) {
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const cjk = withoutCode.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = withoutCode.match(/[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*/g)?.length ?? 0;
  return cjk + words;
}

export function formatDateValue(value) {
  if (!dateIsValid(value)) return 'INVALID';
  return new Date(value).toISOString().slice(0, 10);
}
