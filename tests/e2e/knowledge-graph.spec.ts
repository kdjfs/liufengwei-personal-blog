import { expect, test } from '@playwright/test';

test('knowledge graph supports search, filters, node details, and responsive layout', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const graphResponse = page.waitForResponse((response) =>
    response.url().endsWith('/knowledge-graph.json'),
  );
  await page.goto('/knowledge');
  await expect(page.getByRole('heading', { level: 1, name: /知识正在/ })).toBeVisible();
  expect((await graphResponse).status()).toBe(200);

  const search = page.getByRole('searchbox', { name: '搜索知识' });
  await expect(search).toBeVisible();
  await search.fill('Redis');
  await expect(page.locator('.knowledge-node[data-highlighted="true"]').first()).toBeVisible();

  await page.getByRole('button', { name: '系列', exact: true }).click();
  await expect(page.getByText('图谱的等价键盘导航入口，共 2 个当前可见节点。')).toBeVisible();
  await page.getByRole('button', { name: '重置视图' }).click();

  await page.locator('.knowledge-node[data-type="article"]').first().click();
  await expect(
    page.locator('.knowledge-detail').getByRole('link', { name: /阅读文章/ }),
  ).toHaveAttribute('href', /^\/blog\//);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test('knowledge graph overlays private learning progress from IndexedDB', async ({ page }) => {
  await page.goto('/learning');
  await expect(page.locator('.learning-dashboard')).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('lfw-learning-db', 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('articleProgress', 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.objectStore('articleProgress').put({
        articleSlug: 'di-liu-zhang-mysql-redis-zong-gang',
        title: '第六章MySQL + Redis 总纲',
        category: '后端',
        readSeconds: 900,
        listenSeconds: 120,
        maxProgress: 100,
        lastProgress: 100,
        lastScrollY: 1200,
        firstReadAt: '2026-08-18T10:00:00.000Z',
        lastReadAt: '2026-08-18T11:00:00.000Z',
        completedAt: '2026-08-18T11:00:00.000Z',
        annotationCount: 5,
        daily: {},
      });
    });
    database.close();
  });

  await page.goto('/knowledge');
  const completedMetric = page.locator('.knowledge-stats article').filter({ hasText: '已完成' });
  await expect(completedMetric.locator('strong')).toHaveText('1');
  await expect(
    page.locator('.knowledge-node[data-learning-status="completed"][data-annotated="true"]'),
  ).toHaveCount(1);

  await page.getByRole('searchbox', { name: '搜索知识' }).fill('第六章MySQL');
  await page
    .getByRole('button', { name: /^第六章MySQL \+ Redis 总纲/ })
    .click();
  const detail = page.locator('.knowledge-detail');
  await expect(detail.getByText('已完成', { exact: true })).toBeVisible();
  await expect(detail.getByText('5', { exact: true })).toBeVisible();
});
