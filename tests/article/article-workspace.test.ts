import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('article pages load dedicated layout and Markdown design-system styles', async () => {
  const page = await read('src/pages/blog/[slug].astro');

  assert.match(page, /import '@\/styles\/article\.css'/);
  assert.match(page, /import '@\/styles\/markdown\.css'/);
  assert.match(page, /import '@\/styles\/article-code\.css'/);
});

test('the desktop reading rail exposes existing TOC, annotation, and listening tools', async () => {
  const toc = await read('src/components/blog/TableOfContents.astro');

  assert.match(toc, /class="reading-rail"/);
  assert.match(toc, /data-reading-action="toc"/);
  assert.match(toc, /data-reading-action="annotations"/);
  assert.match(toc, /data-reading-annotation-count/);
  assert.match(toc, /data-reading-action="listening"/);
});

test('article-specific layout and typography no longer live in global.css', async () => {
  const globalCss = await read('src/styles/global.css');

  assert.doesNotMatch(globalCss, /^\.article-hero/m);
  assert.doesNotMatch(globalCss, /^\.article-layout/m);
  assert.doesNotMatch(globalCss, /^\.prose h2/m);
  assert.doesNotMatch(globalCss, /^\.toc /m);
});

test('large articles enhance distant code blocks only near the viewport', async () => {
  const enhancer = await readFile('src/lib/article-code.ts', 'utf8');
  const styles = await readFile('src/styles/article-code.css', 'utf8');
  assert.match(enhancer, /CODE_ENHANCEMENT_ROOT_MARGIN/);
  assert.match(enhancer, /new IntersectionObserver/);
  assert.doesNotMatch(enhancer, /enhanceBlock\(blocks\[0\]\)/);
  assert.match(styles, /content-visibility:\s*auto/);
});
