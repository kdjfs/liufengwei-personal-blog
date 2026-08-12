import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { parseChapterOrder } from './chapter-order.mjs';
import { analyzeMarkdown, BLOG_DIRECTORY, scanFiles, slugify } from './core.mjs';

const KEYWORD_TAGS = [
  ['React', /\breact\b/i],
  ['Vue', /\bvue(?:\.js|\d+)?\b/i],
  ['JavaScript', /\b(?:javascript|js)\b/i],
  ['TypeScript', /\b(?:typescript|ts)\b/i],
  ['Node.js', /\bnode(?:\.js)?\b/i],
  ['MySQL', /\bmysql\b/i],
  ['Redis', /\bredis\b/i],
  ['CSS', /\bcss\b/i],
  ['浏览器', /浏览器/],
  ['算法', /算法|数据结构/],
  ['AI', /(?:^|[^a-z])ai(?:$|[^a-z])|人工智能|大模型|LLM/i],
  ['Agent', /\bagent\b/i],
];

function cleanTitle(value) {
  return String(value ?? '')
    .replace(/^#+\s*/, '')
    .trim();
}

function leadingH1(body) {
  const firstContentLine = body.split(/\r?\n/).find((line) => line.trim().length > 0);
  return firstContentLine?.match(/^#\s+(.+?)\s*$/)?.[1];
}

function fallbackDescription(title, category) {
  if (category === '面经') return `${title}，记录面试过程中的问题、回答与复盘要点。`;
  return `${title}相关内容的学习记录、实践过程与思考整理。`;
}

function inferCategory(file, contentDirectory) {
  const relative = path.relative(contentDirectory, path.dirname(file));
  const firstDirectory = relative.split(path.sep).filter(Boolean)[0];
  return firstDirectory && firstDirectory !== '..' ? firstDirectory : '笔记';
}

function inferTags(title, body, category) {
  const source = `${title}\n${body}`;
  const inferred = KEYWORD_TAGS.filter(([, pattern]) => pattern.test(source)).map(([tag]) => tag);
  return [...new Set(inferred.length > 0 ? inferred : [category])].slice(0, 8);
}

function inferPublishDate(file, today) {
  const filename = path.basename(file, path.extname(file));
  const match = filename.match(/(?:^|[^0-9])(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})(?:[^0-9]|$)/);
  if (!match) return today;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function stableDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function removeDuplicateLeadingH1(body, title) {
  const lines = body.split(/\r?\n/);
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLine < 0) return body;
  const match = lines[firstContentLine].match(/^#\s+(.+?)\s*$/);
  if (!match || cleanTitle(match[1]).toLowerCase() !== cleanTitle(title).toLowerCase()) return body;

  lines.splice(firstContentLine, 1);
  if (lines[firstContentLine]?.trim() === '') lines.splice(firstContentLine, 1);
  return lines.join('\n');
}

export function prepareMarkdownDocument(
  raw,
  { file, contentDirectory = BLOG_DIRECTORY, today = new Date().toISOString().slice(0, 10) },
) {
  const parsed = matter(raw);
  const title = cleanTitle(
    parsed.data.title || leadingH1(parsed.content) || path.basename(file, path.extname(file)),
  );
  const category = String(parsed.data.category || inferCategory(file, contentDirectory)).trim();
  const body = removeDuplicateLeadingH1(parsed.content, title);
  const bodyAnalysis = analyzeMarkdown(body);
  const description = String(
    parsed.data.description || bodyAnalysis.description || fallbackDescription(title, category),
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  const tags =
    Array.isArray(parsed.data.tags) && parsed.data.tags.length > 0
      ? [
          ...new Set(
            parsed.data.tags
              .map(String)
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ].slice(0, 8)
      : inferTags(title, body, category);
  const inferredSeriesOrder =
    parsed.data.series && parsed.data.seriesOrder === undefined
      ? parseChapterOrder(title)
      : undefined;
  const data = {
    ...parsed.data,
    title,
    slug: parsed.data.slug || slugify(title),
    description,
    publishDate: stableDate(parsed.data.publishDate) || inferPublishDate(file, today),
    ...(parsed.data.updatedDate ? { updatedDate: stableDate(parsed.data.updatedDate) } : {}),
    category,
    tags,
    ...(inferredSeriesOrder === undefined ? {} : { seriesOrder: inferredSeriesOrder }),
    cover: parsed.data.cover || 'auto',
    draft: parsed.data.draft ?? false,
    featured: parsed.data.featured ?? false,
    toc: parsed.data.toc ?? true,
  };
  const output = matter.stringify(body, data);
  const changed = output !== raw;

  return { output: changed ? output : raw, changed, data, body };
}

export async function prepareContentDirectory(contentDirectory = BLOG_DIRECTORY) {
  const files = await scanFiles(contentDirectory);
  const prepared = [];
  const slugs = new Map();

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const result = prepareMarkdownDocument(raw, { file, contentDirectory });
    const slug = String(result.data.slug || '').toLowerCase();
    if (!slug) throw new Error(`无法为 ${path.relative(contentDirectory, file)} 生成 slug`);
    if (slugs.has(slug)) {
      throw new Error(
        `slug 冲突：${result.data.slug}\n  ${path.relative(contentDirectory, slugs.get(slug))}\n  ${path.relative(contentDirectory, file)}`,
      );
    }
    slugs.set(slug, file);
    prepared.push({ file, ...result });
  }

  for (const entry of prepared) {
    if (entry.changed) await writeFile(entry.file, entry.output, 'utf8');
  }

  return {
    scanned: prepared.length,
    changed: prepared.filter((entry) => entry.changed).length,
    files: prepared.filter((entry) => entry.changed).map((entry) => entry.file),
  };
}
