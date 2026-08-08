import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSeoGraph,
  PRODUCTION_SITE_URL,
  serializeJsonLd,
  toAbsoluteUrl,
} from '../../src/lib/seo.ts';

test('SEO URLs always resolve against the production origin', () => {
  assert.equal(PRODUCTION_SITE_URL, 'https://liufengwei-personal-blog.vercel.app');
  assert.equal(
    toAbsoluteUrl('/blog/example').href,
    'https://liufengwei-personal-blog.vercel.app/blog/example',
  );
});

test('website pages expose WebSite and Person structured data', () => {
  const graph = createSeoGraph({
    canonical: toAbsoluteUrl('/'),
    title: 'LFW Space',
    description: '个人技术博客与数字花园',
    image: toAbsoluteUrl('/_astro/default.jpg'),
  });

  assert.deepEqual(
    graph['@graph'].map((item) => item['@type']),
    ['WebSite', 'Person'],
  );
});

test('article pages add complete BlogPosting and BreadcrumbList data', () => {
  const graph = createSeoGraph({
    canonical: toAbsoluteUrl('/blog/example'),
    title: '示例文章',
    description: '一篇用于验证结构化数据的示例文章',
    image: toAbsoluteUrl('/_astro/example.jpg'),
    article: {
      publishedTime: new Date('2026-08-01T08:00:00+08:00'),
      updatedTime: new Date('2026-08-02T08:00:00+08:00'),
      category: '工程',
      tags: ['Astro', 'SEO'],
    },
  });
  const posting = graph['@graph'].find((item) => item['@type'] === 'BlogPosting');
  const breadcrumb = graph['@graph'].find((item) => item['@type'] === 'BreadcrumbList');

  assert.equal(posting?.headline, '示例文章');
  assert.equal(posting?.datePublished, '2026-08-01T00:00:00.000Z');
  assert.deepEqual(posting?.keywords, ['Astro', 'SEO']);
  assert.ok(breadcrumb);
  assert.equal(Array.isArray(breadcrumb?.itemListElement), true);
  assert.equal((breadcrumb.itemListElement as unknown[]).length, 3);
  assert.deepEqual((breadcrumb.itemListElement as Array<Record<string, unknown>>)[1], {
    '@type': 'ListItem',
    position: 2,
    name: '工程',
    item: 'https://liufengwei-personal-blog.vercel.app/categories/%E5%B7%A5%E7%A8%8B',
  });
});

test('JSON-LD serialization cannot terminate its script element', () => {
  const serialized = serializeJsonLd({ value: '</script><script>alert(1)</script>' });
  assert.equal(serialized.includes('</script>'), false);
  assert.match(serialized, /\\u003c\/script\\u003e/);
});
