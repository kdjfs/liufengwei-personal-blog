import { expect, type Page, test } from '@playwright/test';

const articlePath = '/blog/3-yue-20-san-wei-jia/';

async function selectFirstParagraph(page: Page): Promise<string> {
  await page.locator('.selection-toolbar').waitFor({ state: 'attached' });
  const paragraph = page.locator('.prose p').first();
  await expect(paragraph).toBeVisible();
  await paragraph.scrollIntoViewIfNeeded();
  return paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return selection?.toString().trim() ?? '';
  });
}

async function holdArticleProgressWrites(page: Page): Promise<() => Promise<void>> {
  await page.evaluate(async () => {
    const state = window as Window & { releaseLearningWrite?: boolean };
    state.releaseLearningWrite = false;

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('lfw-learning-db');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('articleProgress', 'readwrite');
      const store = transaction.objectStore('articleProgress');
      let established = false;

      transaction.onerror = () => reject(transaction.error);
      const keepAlive = () => {
        const request = store.get('__phase-0-write-lock__');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          if (!established) {
            established = true;
            resolve();
          }
          if (state.releaseLearningWrite) {
            database.close();
            return;
          }
          keepAlive();
        };
      };
      keepAlive();
    });
  });

  return async () => {
    await page.evaluate(() => {
      (window as Window & { releaseLearningWrite?: boolean }).releaseLearningWrite = true;
    });
  };
}

test('home navigation, search, and theme controls remain interactive', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '刘凤伟的数字花园' })).toBeVisible();
  await expect(page.locator('.home-cover-image')).toHaveJSProperty('complete', true);
  expect(
    await page
      .locator('.home-cover-image')
      .evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  await expect(page.locator('.post-card').first()).toBeVisible();

  await page.getByRole('button', { name: '打开搜索' }).click();
  await expect(page.getByRole('dialog', { name: '搜索与快捷操作' })).toBeVisible();
  await page.getByPlaceholder('搜索文章或输入页面名称…').fill('学习');
  await expect(page.getByPlaceholder('搜索文章或输入页面名称…')).toHaveValue('学习');
  await page.getByPlaceholder('搜索文章或输入页面名称…').press('Escape');

  const root = page.locator('html');
  await page.getByRole('button', { name: /主题：/ }).click();
  await expect(root).not.toHaveAttribute('data-theme', 'system');
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.getByRole('button', { name: '打开导航' }).click();
    await expect(page.locator('#mobile-nav').getByRole('link', { name: '学习' })).toBeVisible();
  } else {
    await expect(
      page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '学习' }),
    ).toHaveAttribute('href', '/learning');
  }

  await page.goto('/blog/');
  await expect(page.getByRole('heading', { level: 1, name: '文章' })).toBeVisible();
  await expect(page.locator('.post-card').first()).toBeVisible();
});

test('selection Ask AI sends the shared contract and renders mocked SSE', async ({ page }) => {
  let requestPayload: Record<string, unknown> | undefined;
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) forbiddenRequests.push(request.url());
  });
  await page.route('**/api/chat', async (route) => {
    requestPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body:
        'event: content_block_delta\n' +
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"这是模拟的 AI 回答。"}}\n\n' +
        'event: message_stop\n' +
        'data: {"type":"message_stop"}\n\n',
    });
  });

  await page.goto(articlePath);
  await expect(page.locator('[data-article]')).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 900) {
    await expect(page.getByRole('button', { name: '目录', exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole('navigation', { name: '文章目录' })).toBeVisible();
  }
  const selectedText = await selectFirstParagraph(page);
  await page.getByRole('button', { name: '基于选中文字问 AI' }).click();
  await expect(page.locator('#lfw-ai-panel')).toBeVisible();
  await expect(page.getByText('这是模拟的 AI 回答。')).toBeVisible();

  const selection = requestPayload?.selection as { text?: string } | undefined;
  expect(selection?.text).toBe(selectedText);
  expect(requestPayload?.mode).toBe('fast');
  expect(forbiddenRequests).toEqual([]);
});

test('annotations and completed reading persist into the learning dashboard', async ({ page }) => {
  await page.goto(articlePath);
  await selectFirstParagraph(page);
  await page.getByRole('button', { name: '为选中文字添加批注' }).click();
  await page.getByLabel('我的理解').fill('E2E 本地批注');
  await page.getByRole('button', { name: '保存批注' }).click();
  await expect(page.locator('[data-reading-annotation-count]:visible')).toHaveText('1');

  const markRead = page.getByRole('button', { name: '标记已读' });
  await expect(markRead).toBeEnabled();
  const releaseProgressWrites = await holdArticleProgressWrites(page);
  await markRead.click();
  await expect(page.getByRole('button', { name: '正在保存完成状态' })).toBeDisabled();
  await releaseProgressWrites();
  await expect(page.getByRole('button', { name: '已读完' })).toBeDisabled();

  await page.goto('/learning/');
  await expect(page.getByRole('heading', { level: 1, name: '学习面板' })).toBeVisible();
  await expect(
    page.locator('.learning-metrics article').filter({ hasText: '完成文章' }),
  ).toContainText('1 篇');
  await expect(
    page.locator('.learning-metrics article').filter({ hasText: '本地批注' }),
  ).toContainText('1 条');
});
