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
