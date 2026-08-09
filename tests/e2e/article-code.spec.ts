import { expect, test } from '@playwright/test';

const ARTICLE_PATH = '/blog/di-wu-zhang-vue3-he-xin-zhi-shi-cha-lou-bu-que/';

test.beforeEach(async ({ page }) => {
  await page.goto(ARTICLE_PATH);
  await page.locator('.prose pre').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.code-frame').first()).toBeVisible();
});

test('enhances Markdown code fences with an accessible reader toolbar', async ({ page }) => {
  const frame = page.locator('.code-frame').first();

  await expect(frame.locator('.code-frame__lights > span')).toHaveCount(3);
  await expect(frame.locator('.code-frame__language')).toHaveText('JAVASCRIPT');
  await expect(frame.getByRole('button', { name: '全屏查看代码' })).toBeVisible();
  await expect(frame.getByRole('button', { name: '复制代码' })).toBeVisible();

  const initialCount = await page.locator('.code-frame').count();
  await page.evaluate(() => document.dispatchEvent(new Event('astro:page-load')));
  await expect(page.locator('.code-frame')).toHaveCount(initialCount);
  await expect(page.locator('.code-focus-backdrop')).toHaveCount(1);
});

test('copies code and closes fullscreen with Escape', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const frame = page.locator('.code-frame').first();
  await frame.getByRole('button', { name: '复制代码' }).click();
  await expect(frame.getByRole('button', { name: '已复制' })).toBeVisible();

  await frame.getByRole('button', { name: '全屏查看代码' }).click();
  await expect(frame).toHaveClass(/is-fullscreen/);
  await expect(page.locator('html')).toHaveClass(/code-focus-open/);

  await page.keyboard.press('Escape');
  await expect(frame).not.toHaveClass(/is-fullscreen/);
  await expect(page.locator('html')).not.toHaveClass(/code-focus-open/);
  await expect(frame.getByRole('button', { name: '全屏查看代码' })).toBeFocused();
});

test('keeps long code horizontally scrollable without overflowing the page', async ({ page }) => {
  const body = page.locator('.code-frame__body').first();
  const metrics = await body.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(metrics.overflowX).toBe('auto');
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  if (metrics.viewportWidth <= 500)
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
});
