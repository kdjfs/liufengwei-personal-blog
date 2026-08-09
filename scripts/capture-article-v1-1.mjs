import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = fileURLToPath(
  new URL('../docs/images/v1-1-article-reading/', import.meta.url),
);
const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4330';
const articlePath = '/blog/di-er-zhang-javascript-shu-zu-dui-xiang-yu-gao-pin-shu-ju-chu-li/';
const localBrowser = process.env.CI ? {} : { channel: 'chrome' };
const requestedCapture = process.env.ARTICLE_SCREENSHOT;
const wants = (name) => !requestedCapture || requestedCapture === name;

await mkdir(outputDirectory, { recursive: true });
let preview;
let browser;

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Astro Preview did not become ready.');
}

async function createPage({ dark = false, mobile = false } = {}) {
  if (!browser) throw new Error('Screenshot browser is not ready.');
  const page = await browser.newPage({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(
    (theme) => localStorage.setItem('lfw-theme', theme),
    dark ? 'dark' : 'light',
  );
  return page;
}

async function gotoArticle(page, path = articlePath) {
  await page.goto(new URL(path, baseURL).href, { waitUntil: 'networkidle' });
  await page.locator('.prose').waitFor({ state: 'visible' });
}

async function captureViewport(name, page) {
  await page.screenshot({
    path: `${outputDirectory}/${name}.png`,
    animations: 'disabled',
  });
  console.log(`✓ docs/images/v1-1-article-reading/${name}.png`);
}

async function captureElement(name, locator) {
  await locator.screenshot({
    path: `${outputDirectory}/${name}.png`,
    animations: 'disabled',
  });
  console.log(`✓ docs/images/v1-1-article-reading/${name}.png`);
}

async function captureMarkdown(page) {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page
    .locator('.prose blockquote')
    .first()
    .evaluate((element) => {
      document.documentElement.style.scrollBehavior = 'auto';
      element.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -140);
    });
  await page.waitForTimeout(100);
  await captureViewport('04-markdown-heading-quote-table', page);
}

try {
  if (!process.env.SCREENSHOT_BASE_URL) {
    preview = spawn(
      process.execPath,
      ['node_modules/astro/bin/astro.mjs', 'preview', '--host', '127.0.0.1', '--port', '4330'],
      { cwd: projectDirectory, stdio: 'inherit', shell: false },
    );
    await waitForPreview();
  }

  browser = await chromium.launch(localBrowser);

  if (wants('light')) {
    const lightArticle = await createPage();
    await lightArticle.setViewportSize({ width: 1440, height: 1400 });
    await gotoArticle(lightArticle);
    await captureViewport('01-light-article-header-toc', lightArticle);
    await captureElement('02-light-code-block-v2', lightArticle.locator('.code-frame').first());
    await lightArticle.close();
  }

  if (wants('dark')) {
    const darkCode = await createPage({ dark: true });
    await gotoArticle(darkCode);
    await captureElement('03-dark-code-block-v2', darkCode.locator('.code-frame').first());
    await darkCode.close();
  }

  if (wants('markdown')) {
    const markdown = await createPage();
    await gotoArticle(markdown, '/blog/hello-lfw-space/');
    await captureMarkdown(markdown);
    await markdown.close();
  }

  if (wants('mobile')) {
    const mobile = await createPage({ mobile: true });
    await gotoArticle(mobile);
    await captureViewport('05-mobile-390-article', mobile);
    await mobile.close();
  }

  if (wants('selection')) {
    const selection = await createPage();
    await gotoArticle(selection);
    await selection.getByRole('button', { name: '打开 LFW AI 助手' }).click();
    await selection.locator('#lfw-ai-panel').waitFor({ state: 'visible' });
    await selection.locator('.prose p').first().scrollIntoViewIfNeeded();
    await selection.evaluate(() => {
      const paragraph = document.querySelector('.prose p');
      const text = paragraph?.firstChild;
      if (!text) return;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, Math.min(18, text.textContent?.length ?? 0));
      const browserSelection = window.getSelection();
      browserSelection?.removeAllRanges();
      browserSelection?.addRange(range);
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await selection.locator('.selection-toolbar').waitFor({ state: 'visible' });
    await captureViewport('06-selection-toolbar-ai', selection);
    await selection.close();
  }
} finally {
  await browser?.close();
  preview?.kill();
}
