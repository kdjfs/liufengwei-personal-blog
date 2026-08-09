import { expect, test } from '@playwright/test';

const ARTICLE_PATH = '/blog/di-er-zhang-javascript-shu-zu-dui-xiang-yu-gao-pin-shu-ju-chu-li/';

test.beforeEach(async ({ page }) => {
  await page.goto(ARTICLE_PATH);
  await expect(page.locator('.prose')).toBeVisible();
});

test('reading tools reuse the existing annotation and listening experiences', async ({ page }) => {
  const desktop = (page.viewportSize()?.width ?? 0) > 1024;
  const tools = desktop ? page.locator('.reading-rail') : page.locator('.mobile-reading-actions');

  await tools.locator('[data-reading-action="annotations"]').click();
  await expect(page.locator('.annotation-drawer')).toBeVisible();
  await page.keyboard.press('Escape');

  await tools.locator('[data-reading-action="listening"]').click();
  await expect(page.locator('.listening-panel')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('reading rail switches to compact mobile tools without page overflow', async ({ page }) => {
  const desktop = (page.viewportSize()?.width ?? 0) > 1024;
  if (desktop) {
    await expect(page.locator('.reading-rail')).toBeVisible();
    await expect(page.locator('.mobile-toc-bar')).toBeHidden();
  } else {
    await expect(page.locator('.reading-rail')).toBeHidden();
    await expect(page.locator('.mobile-toc-bar')).toBeVisible();
  }

  const dimensions = await page.evaluate(() => {
    const title = document.querySelector('.article-hero h1');
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      titleSize: title
        ? Number.parseFloat(getComputedStyle(title).fontSize)
        : Number.POSITIVE_INFINITY,
    };
  });
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(dimensions.titleSize).toBeLessThanOrEqual(46);
});
