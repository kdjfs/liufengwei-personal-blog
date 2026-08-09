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

test('annotation count is synchronized across desktop and mobile reading tools', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('lfw:annotations:changed', { detail: { articleSlug: 'current', count: 3 } }),
    );
  });

  await expect(page.locator('[data-reading-annotation-count]')).toHaveCount(2);
  await expect(page.locator('[data-reading-annotation-count]').first()).toHaveText('3');
  await expect(page.locator('.annotation-drawer-trigger')).toBeHidden();
});

test('article footer keeps compact navigation and at most three related posts', async ({
  page,
}) => {
  await expect(page.locator('.article-nav')).toBeVisible();
  const related = page.locator('.related-posts .post-card');
  expect(await related.count()).toBeGreaterThanOrEqual(2);
  expect(await related.count()).toBeLessThanOrEqual(3);
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

test('article workspace stays readable at every release viewport', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'desktop project owns the viewport matrix',
  );

  for (const width of [1920, 1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await page.reload();
    await expect(page.locator('.article-hero h1')).toBeVisible();

    const state = await page.evaluate(() => {
      const title = document.querySelector<HTMLElement>('.article-hero h1');
      const rail = document.querySelector<HTMLElement>('.reading-rail');
      const mobileTools = document.querySelector<HTMLElement>('.mobile-toc-bar');
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
        railVisible: rail ? getComputedStyle(rail).display !== 'none' : false,
        mobileToolsVisible: mobileTools ? getComputedStyle(mobileTools).display !== 'none' : false,
      };
    });

    expect(state.overflow, `${width}px page overflow`).toBeLessThanOrEqual(0);
    expect(state.titleSize, `${width}px title size`).toBeGreaterThanOrEqual(width <= 390 ? 30 : 32);
    expect(state.titleSize, `${width}px title size`).toBeLessThanOrEqual(46);
    expect(state.railVisible, `${width}px desktop rail`).toBe(width > 1024);
    expect(state.mobileToolsVisible, `${width}px mobile tools`).toBe(width <= 1024);
  }
});
