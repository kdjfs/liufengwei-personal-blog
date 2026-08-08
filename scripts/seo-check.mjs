import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DIST_DIR = path.resolve('dist');
const PRODUCTION_ORIGIN = 'https://liufengwei-personal-blog.vercel.app';
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const resolved = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(resolved) : resolved;
    }),
  );
  return files.flat();
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'))?/g)].map((match) => [
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? '',
    ]),
  );
}

function metadata(html) {
  const values = new Map();
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = attrs.name ?? attrs.property;
    if (!key) continue;
    const entries = values.get(key) ?? [];
    entries.push(attrs.content ?? '');
    values.set(key, entries);
  }
  return values;
}

function canonicalLink(html) {
  for (const match of html.matchAll(/<link\s+[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs.rel === 'canonical') return attrs.href;
  }
}

function structuredData(html, label) {
  const blocks = [];
  for (const match of html.matchAll(
    /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (error) {
      failures.push(`${label}: JSON-LD 无法解析（${error.message}）`);
    }
  }
  return blocks;
}

function requireValue(values, key, label) {
  const value = values.get(key)?.[0];
  if (!value) failures.push(`${label}: 缺少 ${key}`);
  return value;
}

function assertHttps(value, key, label) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') failures.push(`${label}: ${key} 不是 HTTPS 绝对地址`);
    if (['localhost', '127.0.0.1'].includes(url.hostname)) {
      failures.push(`${label}: ${key} 仍指向本地地址`);
    }
  } catch {
    failures.push(`${label}: ${key} 不是合法绝对地址`);
  }
}

const htmlFiles = (await walk(DIST_DIR)).filter((file) => file.endsWith('.html'));
const socialImages = new Set();

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const label = path.relative(DIST_DIR, file).replaceAll('\\', '/');
  const meta = metadata(html);
  const canonical = canonicalLink(html);
  const ogUrl = requireValue(meta, 'og:url', label);
  const ogImage = requireValue(meta, 'og:image', label);

  requireValue(meta, 'description', label);
  requireValue(meta, 'og:title', label);
  requireValue(meta, 'og:description', label);
  requireValue(meta, 'og:image:alt', label);
  requireValue(meta, 'twitter:title', label);
  requireValue(meta, 'twitter:description', label);
  requireValue(meta, 'twitter:image', label);
  requireValue(meta, 'twitter:image:alt', label);
  if (meta.get('og:image:width')?.[0] !== '1200') failures.push(`${label}: OG 宽度不是 1200`);
  if (meta.get('og:image:height')?.[0] !== '630') failures.push(`${label}: OG 高度不是 630`);
  if (meta.get('twitter:card')?.[0] !== 'summary_large_image') {
    failures.push(`${label}: Twitter card 不是 summary_large_image`);
  }
  assertHttps(canonical, 'canonical', label);
  assertHttps(ogUrl, 'og:url', label);
  assertHttps(ogImage, 'og:image', label);
  if (canonical && ogUrl && canonical !== ogUrl)
    failures.push(`${label}: canonical 与 og:url 不一致`);
  if (ogImage) socialImages.add(ogImage);

  const schemas = structuredData(html, label);
  const graph = schemas.flatMap((schema) => schema['@graph'] ?? []);
  for (const requiredType of ['WebSite', 'Person']) {
    if (!graph.some((item) => item['@type'] === requiredType)) {
      failures.push(`${label}: JSON-LD 缺少 ${requiredType}`);
    }
  }

  const isArticle = html.includes('data-article');
  if (isArticle) {
    if (meta.get('og:type')?.[0] !== 'article') failures.push(`${label}: 文章缺少 og:type=article`);
    for (const requiredType of ['BlogPosting', 'BreadcrumbList']) {
      if (!graph.some((item) => item['@type'] === requiredType)) {
        failures.push(`${label}: 文章 JSON-LD 缺少 ${requiredType}`);
      }
    }
  }

  if (label === '404.html' && !meta.get('robots')?.[0]?.includes('noindex')) {
    failures.push('404.html: 缺少 noindex');
  }
}

for (const imageUrl of socialImages) {
  const url = new URL(imageUrl);
  if (url.origin !== PRODUCTION_ORIGIN) {
    failures.push(`OG 图片域名不是生产域名：${imageUrl}`);
    continue;
  }
  const imagePath = path.join(DIST_DIR, decodeURIComponent(url.pathname).replace(/^\//, ''));
  try {
    const info = await sharp(imagePath).metadata();
    if (info.width !== 1200 || info.height !== 630) {
      failures.push(`${url.pathname}: 实际尺寸为 ${info.width}×${info.height}`);
    }
  } catch (error) {
    failures.push(`${url.pathname}: 无法读取 OG 图片（${error.message}）`);
  }
}

const robots = await readFile(path.join(DIST_DIR, 'robots.txt'), 'utf8').catch(() => '');
if (!robots.includes(`Sitemap: ${PRODUCTION_ORIGIN}/sitemap-index.xml`)) {
  failures.push('robots.txt: 缺少生产 sitemap 地址');
}

const xmlFiles = (await readdir(DIST_DIR))
  .filter((name) => name.endsWith('.xml'))
  .map((name) => path.join(DIST_DIR, name));
const xml = (await Promise.all(xmlFiles.map((file) => readFile(file, 'utf8')))).join('\n');
if (!xml.includes(PRODUCTION_ORIGIN)) failures.push('XML 产物未使用生产域名');
if (/https?:\/\/(?:localhost|127\.0\.0\.1)/.test(xml)) failures.push('XML 产物包含本地地址');
if (/\/404(?:\.html)?<\/loc>/.test(xml)) failures.push('sitemap 不应包含 404');

if (failures.length > 0) {
  console.error(`SEO 检查失败（${failures.length} 项）`);
  failures.forEach((failure) => {
    console.error(`- ${failure}`);
  });
  process.exitCode = 1;
} else {
  console.log(
    `SEO 检查通过：${htmlFiles.length} 个页面，${socialImages.size} 张 1200×630 OG 图片。`,
  );
}
