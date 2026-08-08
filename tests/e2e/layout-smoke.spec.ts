import { expect, test } from '@playwright/test';

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
] as const;

const routes = [
  { path: '/', status: 200 },
  { path: '/blog/', status: 200 },
  { path: '/blog/di-yi-pian-1-3-zhang/', status: 200 },
  { path: '/categories/AI/', status: 200 },
  { path: '/tags/AI/', status: 200 },
  { path: '/projects/', status: 200 },
  { path: '/learning/', status: 200 },
  { path: '/about/', status: 200 },
  { path: '/404.html', status: 200 },
] as const;

test('core routes have no console errors, broken images, or horizontal overflow', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'One browser project covers the viewport matrix.',
  );

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      const response = await page.goto(route.path, { waitUntil: 'networkidle' });
      expect(response?.status(), `${route.path} at ${viewport.width}px`).toBe(route.status);

      const diagnostics = await page.evaluate(() => ({
        brokenImages: Array.from(document.images)
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));

      expect(consoleErrors, `${route.path} console at ${viewport.width}px`).toEqual([]);
      expect(pageErrors, `${route.path} page errors at ${viewport.width}px`).toEqual([]);
      expect(diagnostics.brokenImages, `${route.path} images at ${viewport.width}px`).toEqual([]);
      expect(
        diagnostics.documentWidth,
        `${route.path} overflow at ${viewport.width}px`,
      ).toBeLessThanOrEqual(diagnostics.viewportWidth + 1);
    }
  }
});
