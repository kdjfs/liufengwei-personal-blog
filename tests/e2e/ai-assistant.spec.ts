import { expect, test } from '@playwright/test';

async function openAssistant(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '打开 LFW AI 助手' }).click();
  await expect(page.getByRole('dialog', { name: 'LFW AI' })).toBeVisible();
}

test('assistant exposes compact controls, settings, clear confirmation, and restores focus', async ({
  page,
}) => {
  await openAssistant(page);
  await expect(page.getByRole('button', { name: '快速' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '深度' }).click();
  await expect(page.getByRole('button', { name: '深度' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '快速' }).click();
  await expect(page.getByText('已连接博客知识')).toBeVisible();
  await page.getByRole('button', { name: 'AI 设置' }).click();
  await expect(page.getByRole('heading', { name: '云端隐私选项' })).toBeVisible();
  await page.getByRole('button', { name: 'AI 设置' }).click();

  await page.getByRole('button', { name: '按顺序列出系列' }).click();
  await expect(page.locator('.ai-message--assistant')).toBeVisible();
  await page.getByRole('button', { name: '清空对话' }).click();
  await expect(page.getByText('清空当前对话？')).toBeVisible();
  await page.getByRole('button', { name: '取消清空' }).click();
  await expect(page.locator('.ai-message--assistant')).toBeVisible();
  await page.getByRole('button', { name: '清空对话' }).click();
  await page.getByRole('button', { name: '确认清空' }).click();
  await expect(page.locator('.ai-welcome')).toBeVisible();

  await page.getByRole('button', { name: '最小化 AI 助手' }).click();
  await expect(page.getByRole('button', { name: '打开 LFW AI 助手' })).toBeFocused();
  await page.getByRole('button', { name: '打开 LFW AI 助手' }).press('Enter');
  await expect(page.getByLabel('向 LFW AI 提问')).toBeFocused();

  await page.getByRole('button', { name: '关闭 AI 助手', exact: true }).click();
  await expect(page.getByRole('button', { name: '打开 LFW AI 助手' })).toBeFocused();
});

test('composer becomes stop control while streaming and sources stay collapsed by default', async ({
  page,
}) => {
  let releaseStream: (() => void) | undefined;
  await page.route('**/api/chat', async (route) => {
    await new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"回答完成"}}\n\n',
    });
  });
  await openAssistant(page);
  const input = page.getByLabel('向 LFW AI 提问');
  await input.fill('MVCC 是怎么实现的？');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: '停止生成' })).toBeVisible();
  releaseStream?.();
  await expect(page.getByText('回答完成')).toBeVisible();
  const sources = page.locator('.ai-sources details');
  await expect(sources.locator('summary')).toHaveText(/参考 \d+ 篇博客内容/);
  await expect(sources).not.toHaveAttribute('open', '');
  await sources.locator('summary').click();
  await expect(sources).toHaveAttribute('open', '');
});

test('streaming follows at the bottom, preserves manual scroll, then returns to latest', async ({
  page,
}) => {
  await page.route('**/api/chat', async (route) => {
    const chunks = Array.from({ length: 20 }, (_, index) => `第 ${index + 1} 段回答。`).join(
      '\n\n',
    );
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: chunks } })}\n\n`,
    });
  });
  await openAssistant(page);
  const input = page.getByLabel('向 LFW AI 提问');
  for (let index = 0; index < 3; index += 1) {
    await input.fill(`请详细解释测试问题 ${index + 1}`);
    await input.press('Enter');
    await expect(page.getByText('第 20 段回答。').last()).toBeVisible();
  }

  const messages = page.locator('.ai-messages');
  await messages.evaluate((element) => element.scrollTo({ top: 0 }));
  await messages.dispatchEvent('scroll');
  const heldTop = await messages.evaluate((element) => element.scrollTop);
  await expect(page.getByRole('button', { name: '回到最新回答' })).toBeVisible();
  expect(await messages.evaluate((element) => element.scrollTop)).toBe(heldTop);
  await page.getByRole('button', { name: '回到最新回答' }).click();
  await expect(page.getByRole('button', { name: '回到最新回答' })).toBeHidden();
});
