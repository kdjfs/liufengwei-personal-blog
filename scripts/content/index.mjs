import { existsSync } from 'node:fs';
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import matter from 'gray-matter';
import {
  BLOG_DIRECTORY,
  countWords,
  findContentIssues,
  formatDateValue,
  IMPORT_EXTENSIONS,
  loadContentEntries,
  parseContentFile,
  SLUG_PATTERN,
  scanFiles,
  slugify,
} from './core.mjs';

function parseArgs(tokens) {
  const flags = new Map();
  const positionals = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (next && !next.startsWith('--')) {
      flags.set(key, next);
      index += 1;
    } else flags.set(key, true);
  }
  return { flags, positionals };
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', 'y', '1', '是'].includes(String(value).toLowerCase());
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function printHeading(title, subtitle) {
  const line = '─'.repeat(64);
  console.log(`\n${line}\n  LFW SPACE / ${title}\n  ${subtitle}\n${line}`);
}

async function contentNew(flags) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const interactive = flags.size === 0;
  const ask = async (key, label, fallback = '') => {
    if (flags.has(key)) return flags.get(key) === true ? fallback : String(flags.get(key));
    if (!interactive) return fallback;
    const suffix = fallback ? ` [${fallback}]` : '';
    return (await prompt.question(`${label}${suffix}：`)).trim() || fallback;
  };

  try {
    printHeading('NEW ARTICLE', '创建一篇具备稳定 URL 的文章');
    const title = await ask('title', '标题');
    const description = await ask('description', '摘要');
    const category = await ask('category', '分类');
    const tags = unique((await ask('tags', '标签（逗号分隔）')).split(/[,，]/));
    const publishDate = await ask('date', '发布日期', new Date().toISOString().slice(0, 10));
    const draft = boolValue(await ask('draft', '是否草稿 yes/no', 'yes'), true);
    const featured = boolValue(await ask('featured', '是否精选 yes/no', 'no'));
    const series = flags.has('no-series') ? '' : await ask('series', '系列（可选）');
    const cover = flags.has('no-cover') ? '' : await ask('cover', '封面（可选）', 'grid');
    const requestedSlug = await ask('slug', 'Slug（可选）');
    const slug = slugify(requestedSlug || title);

    if (!title || !description || !category || tags.length === 0) {
      throw new Error('标题、摘要、分类和标签不能为空');
    }
    if (description.length < 10 || description.length > 220) {
      throw new Error('摘要长度必须在 10 到 220 个字符之间');
    }
    if (formatDateValue(publishDate) === 'INVALID') throw new Error('发布日期无效');
    if (!SLUG_PATTERN.test(slug)) throw new Error('无法生成有效 slug，请手动提供');
    const { entries } = await loadContentEntries();
    if (entries.some((entry) => entry.data.slug?.toLowerCase() === slug.toLowerCase())) {
      throw new Error(`slug 已存在：${slug}`);
    }

    const target = path.join(BLOG_DIRECTORY, `${slug}.md`);
    const data = {
      title,
      slug,
      description,
      publishDate,
      category,
      tags,
      ...(cover ? { cover } : {}),
      draft,
      featured,
      ...(series
        ? { series, seriesOrder: Number(await ask('series-order', '系列顺序', '1')) }
        : {}),
      toc: true,
    };
    const body = `\n# ${title}\n\n<!-- TODO: 在这里开始写作。 -->\n`;
    const output = matter.stringify(body, data);
    if (flags.has('dry-run')) {
      console.log(`\n[DRY RUN] 将创建 ${path.relative(process.cwd(), target)}\n${output}`);
    } else {
      await mkdir(BLOG_DIRECTORY, { recursive: true });
      await writeFile(target, output, { encoding: 'utf8', flag: 'wx' });
      console.log(`\n✓ 已创建 ${path.relative(process.cwd(), target)}\n  /blog/${slug}`);
    }
  } finally {
    prompt.close();
  }
}

async function contentList(flags) {
  const { entries, parseIssues } = await loadContentEntries();
  if (parseIssues.length) throw new Error(parseIssues.map((issue) => issue.message).join('\n'));
  const search = String(flags.get('search') ?? '').toLowerCase();
  const category = String(flags.get('category') ?? '').toLowerCase();
  const filtered = entries
    .filter((entry) => !flags.has('draft') || entry.data.draft)
    .filter((entry) => !flags.has('published') || !entry.data.draft)
    .filter((entry) => !category || entry.data.category?.toLowerCase() === category)
    .filter(
      (entry) =>
        !search ||
        `${entry.data.title} ${entry.data.slug} ${entry.data.category} ${(entry.data.tags ?? []).join(' ')}`
          .toLowerCase()
          .includes(search),
    )
    .sort((a, b) => new Date(b.data.publishDate) - new Date(a.data.publishDate));

  printHeading('CONTENT LIST', `${filtered.length} 篇文章`);
  console.table(
    filtered.map((entry) => ({
      Title: entry.data.title,
      Slug: entry.data.slug,
      Category: entry.data.category,
      Date: formatDateValue(entry.data.publishDate),
      Draft: entry.data.draft ? 'yes' : 'no',
      Featured: entry.data.featured ? 'yes' : 'no',
      Series: entry.data.series ?? '—',
    })),
  );
}

async function contentStats() {
  const { entries, parseIssues } = await loadContentEntries();
  if (parseIssues.length) throw new Error(parseIssues.map((issue) => issue.message).join('\n'));
  const words = entries.reduce((sum, entry) => sum + countWords(entry.body), 0);
  const stats = {
    Articles: entries.length,
    Published: entries.filter((entry) => !entry.data.draft).length,
    Draft: entries.filter((entry) => entry.data.draft).length,
    Categories: new Set(entries.map((entry) => entry.data.category)).size,
    Tags: new Set(entries.flatMap((entry) => entry.data.tags ?? [])).size,
    Series: new Set(entries.map((entry) => entry.data.series).filter(Boolean)).size,
    Words: words.toLocaleString('zh-CN'),
    'Reading Time': `${Math.max(1, Math.ceil(words / 220))} min`,
  };
  printHeading('CONTENT STATS', '数字花园内容概览');
  for (const [label, value] of Object.entries(stats)) {
    console.log(`  ${label.padEnd(16)} ${String(value).padStart(8)}`);
  }
  console.log('');
}

async function contentCheck() {
  const { entries, parseIssues } = await loadContentEntries();
  const issues = [...parseIssues, ...findContentIssues(entries)];
  printHeading('CONTENT CHECK', `${entries.length} 篇文章 · ${issues.length} 个问题`);
  if (issues.length === 0) {
    console.log('  ✓ Frontmatter、Slug、日期、图片、链接与 Series 检查通过\n');
    return;
  }
  for (const issue of issues) console.error(`  ✗ ${issue.file}\n    ${issue.message}`);
  process.exitCode = 1;
}

function inferImportData(entry) {
  const title =
    entry.data.title?.trim() ||
    entry.analysis.title ||
    path.basename(entry.file, path.extname(entry.file));
  const inferred = [];
  const description =
    entry.data.description?.trim() || entry.analysis.description || 'TODO: 请补充文章摘要。';
  const category = entry.data.category?.trim() || 'TODO';
  const tags =
    Array.isArray(entry.data.tags) && entry.data.tags.length ? entry.data.tags : ['TODO'];
  const rawSlug = entry.data.slug || title;
  const slug = SLUG_PATTERN.test(String(rawSlug)) ? String(rawSlug) : slugify(String(rawSlug));
  if (!entry.data.title) inferred.push('title');
  if (!entry.data.description) inferred.push('description');
  if (!entry.data.category) inferred.push('category');
  if (!entry.data.tags) inferred.push('tags');
  if (!entry.data.publishDate) inferred.push('publishDate');
  if (!entry.data.slug) inferred.push('slug');
  return {
    title,
    slug,
    description,
    publishDate:
      formatDateValue(entry.data.publishDate) === 'INVALID'
        ? new Date().toISOString().slice(0, 10)
        : formatDateValue(entry.data.publishDate),
    category,
    tags: unique(tags.map(String)),
    draft: entry.data.draft ?? true,
    featured: entry.data.featured ?? false,
    ...(entry.data.series
      ? { series: entry.data.series, seriesOrder: entry.data.seriesOrder ?? 1 }
      : {}),
    ...(entry.data.cover ? { cover: entry.data.cover } : {}),
    toc: entry.data.toc ?? true,
    inferred,
  };
}

function rewriteImportedBody(entry, sourceMap, slug, assetPlans) {
  let body = entry.body || entry.raw;
  for (const asset of assetPlans) {
    body = body.split(`](${asset.original})`).join(`](../../assets/blog/${slug}/${asset.name})`);
  }
  for (const [sourceFile, targetSlug] of sourceMap) {
    const relative = path.relative(path.dirname(entry.file), sourceFile).replaceAll('\\', '/');
    for (const candidate of [relative, `./${relative}`]) {
      body = body.split(`](${candidate})`).join(`](/blog/${targetSlug})`);
    }
  }
  return body;
}

async function contentImport(flags, positionals) {
  const source = positionals[0];
  if (!source) throw new Error('用法：pnpm content:import "<folder>" --dry-run|--write');
  const sourceDirectory = path.resolve(source);
  await access(sourceDirectory);
  const files = await scanFiles(sourceDirectory, IMPORT_EXTENSIONS);
  if (files.length > 10_000) throw new Error('扫描文件超过 10,000 个，请缩小导入目录');

  const { entries: existing } = await loadContentEntries();
  const existingSlugs = new Set(existing.map((entry) => entry.data.slug?.toLowerCase()));
  const existingTitles = new Set(existing.map((entry) => entry.data.title?.trim().toLowerCase()));
  const candidates = [];
  const seen = new Set();
  const sourceMap = new Map();

  for (const file of files) {
    const entry = await parseContentFile(file);
    const data = inferImportData(entry);
    sourceMap.set(file, data.slug);
    const reasons = [];
    if (
      !data.slug ||
      existingSlugs.has(data.slug.toLowerCase()) ||
      seen.has(data.slug.toLowerCase())
    )
      reasons.push('slug 冲突');
    if (existingTitles.has(data.title.trim().toLowerCase())) reasons.push('title 冲突');
    if (!SLUG_PATTERN.test(data.slug)) reasons.push('slug 非法');
    seen.add(data.slug.toLowerCase());
    const assetPlans = [];
    for (const image of entry.analysis.images) {
      if (/^(https?:|data:|\/)/i.test(image.url)) continue;
      const clean = image.url.split(/[?#]/)[0];
      const sourceAsset = path.resolve(path.dirname(file), clean);
      if (!existsSync(sourceAsset)) reasons.push(`图片不存在：${image.url}`);
      else
        assetPlans.push({ original: image.url, source: sourceAsset, name: path.basename(clean) });
    }
    const status = reasons.length ? 'conflict' : data.inferred.length ? 'confirm' : 'ready';
    candidates.push({ entry, data, reasons, status, assetPlans });
  }

  const counts = {
    scanned: files.length,
    ready: candidates.filter((item) => item.status === 'ready').length,
    confirm: candidates.filter((item) => item.status === 'confirm').length,
    conflict: candidates.filter((item) => item.status === 'conflict').length,
    skipped: 0,
  };
  printHeading('CONTENT IMPORT', flags.has('write') ? 'WRITE MODE' : 'DRY RUN');
  console.log(
    `  扫描文章      ${counts.scanned}\n  可导入        ${counts.ready}\n  需要确认      ${counts.confirm}\n  冲突          ${counts.conflict}\n  跳过          ${counts.skipped}\n`,
  );
  for (const item of candidates) {
    const marker = item.status === 'ready' ? '✓' : item.status === 'confirm' ? '!' : '×';
    console.log(
      `  ${marker} [${item.status.toUpperCase()}] ${path.relative(sourceDirectory, item.entry.file)}`,
    );
    console.log(`    ${item.data.title} → /blog/${item.data.slug}`);
    if (item.data.inferred.length) console.log(`    TODO/推断：${item.data.inferred.join(', ')}`);
    if (item.reasons.length) console.log(`    冲突：${item.reasons.join('；')}`);
    console.log(
      `    图片 ${item.entry.analysis.images.length} · 链接 ${item.entry.analysis.links.length}`,
    );
  }

  if (!flags.has('write')) {
    console.log('\n  未写入任何文件。确认结果后使用 --write。\n');
    return;
  }
  if (counts.conflict > 0) throw new Error('存在冲突，已停止写入；请先解决后重试');

  for (const item of candidates) {
    const target = path.join(BLOG_DIRECTORY, `${item.data.slug}.md`);
    await access(target).then(
      () => Promise.reject(new Error(`目标已存在：${target}`)),
      () => undefined,
    );
  }
  for (const item of candidates) {
    const { inferred, ...frontmatter } = item.data;
    const body = rewriteImportedBody(item.entry, sourceMap, item.data.slug, item.assetPlans);
    const target = path.join(BLOG_DIRECTORY, `${item.data.slug}.md`);
    for (const asset of item.assetPlans) {
      const assetDirectory = path.resolve('src/assets/blog', item.data.slug);
      await mkdir(assetDirectory, { recursive: true });
      await copyFile(asset.source, path.join(assetDirectory, asset.name), 1);
    }
    await writeFile(target, matter.stringify(body, frontmatter), { encoding: 'utf8', flag: 'wx' });
  }
  console.log(`\n  ✓ 已导入 ${candidates.length} 篇文章，原目录未修改。\n`);
}

const [command, ...tokens] = process.argv.slice(2);
const { flags, positionals } = parseArgs(tokens);

try {
  if (command === 'new') await contentNew(flags);
  else if (command === 'list') await contentList(flags);
  else if (command === 'check') await contentCheck();
  else if (command === 'stats') await contentStats();
  else if (command === 'import') await contentImport(flags, positionals);
  else throw new Error('可用命令：new、list、check、stats、import');
} catch (error) {
  console.error(`\nContent 命令失败：${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
