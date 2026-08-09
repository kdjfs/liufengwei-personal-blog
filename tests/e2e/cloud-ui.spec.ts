import { expect, test } from '@playwright/test';

const cloudEnabled = process.env.LFW_E2E_CLOUD === '1';

test('configured cloud UI is deferred, accessible, and sends explicit AI privacy choices', async ({
  page,
}) => {
  test.skip(!cloudEnabled, 'Cloud UI requires a build with explicit public API origins');
  const aiPayloads: Record<string, unknown>[] = [];
  const corsHeaders = {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-origin': 'http://127.0.0.1:4325',
    'access-control-expose-headers': 'X-LFW-Conversation-Id, X-LFW-Request-Id',
  };

  await page.route('http://127.0.0.1:8788/api/auth/get-session', async (route) => {
    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'user-e2e', name: 'Cloud Learner' } }),
    });
  });
  await page.route('http://127.0.0.1:8788/api/v1/ai/chat', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    aiPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'x-lfw-conversation-id': '4a464be3-3fb7-4dca-915d-253589e15cb8',
      },
      contentType: 'text/event-stream; charset=utf-8',
      body:
        'event: content_block_delta\n' +
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"云端模拟回答"}}\n\n' +
        'event: message_stop\n' +
        'data: {"type":"message_stop"}\n\n',
    });
  });

  await page.goto('/learning/');
  await expect(page.getByRole('heading', { level: 2, name: '跨设备学习云' })).toBeVisible();
  await expect(page.getByText('Cloud Learner')).toBeVisible();
  await expect(page.getByRole('button', { name: '立即同步' })).toBeVisible();

  await page.goto('/blog/3-yue-20-san-wei-jia/');
  await page.getByRole('button', { name: '打开 LFW AI 助手' }).click();
  await expect(page.getByRole('dialog', { name: 'LFW AI' })).toBeVisible();
  await expect(page.getByRole('group', { name: '云端隐私' })).toBeVisible();
  await page.getByLabel('保存本次对话').check();
  await page.getByLabel('使用相关学习记录').check();
  await page.getByLabel('向 LFW AI 提问').fill('结合我的学习记录解释 Redis lease');
  await page.getByRole('button', { name: '发送消息' }).click();
  await expect(page.getByText('云端模拟回答')).toBeVisible();

  expect(aiPayloads[0]?.cloud).toEqual({
    persistConversation: true,
    privateLearningContext: true,
  });

  await page.getByLabel('向 LFW AI 提问').fill('继续解释 lease owner token');
  await page.getByRole('button', { name: '发送消息' }).click();
  await expect.poll(() => aiPayloads.length).toBe(2);
  expect(aiPayloads[1]?.cloud).toEqual({
    persistConversation: true,
    conversationId: '4a464be3-3fb7-4dca-915d-253589e15cb8',
    privateLearningContext: true,
  });
});
