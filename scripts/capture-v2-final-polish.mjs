import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../docs/images/v2-final-polish/', import.meta.url));
const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4330';
const localBrowser = process.env.CI ? {} : { channel: 'chrome' };
const articlePath = '/blog/di-san-zhang-mysql-shi-wu-mvcc-yu-suo/';
const seriesPath = '/series/MySQL%20%E4%B8%8E%20Redis%20%E5%89%8D%E7%AB%AF%E9%80%9F%E6%88%90/';

await mkdir(outputDirectory, { recursive: true });
let preview;
let browser;

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(baseURL)).ok) return;
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
    isMobile: mobile,
    hasTouch: mobile,
  });
  await page.addInitScript(
    (theme) => localStorage.setItem('lfw-theme', theme),
    dark ? 'dark' : 'light',
  );
  return page;
}

async function ready(page, path = '/') {
  await page.goto(new URL(path, baseURL).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

async function openAssistant(page) {
  await page.getByRole('button', { name: '打开 LFW AI 助手' }).click();
  await page.locator('#lfw-ai-panel').waitFor({ state: 'visible' });
}

async function capture(name, page) {
  await page.screenshot({
    path: `${outputDirectory}/${name}.png`,
    animations: 'disabled',
  });
  console.log(`✓ docs/images/v2-final-polish/${name}.png`);
}

async function mockChat(page) {
  const answer = [
    '## MVCC 的核心思路',
    '',
    'MVCC 让一次读取看到一个一致的**版本快照**，从而减少读写之间的互相阻塞。',
    '',
    '1. 每行记录保留事务信息。',
    '2. Undo Log 串起历史版本。',
    '3. Read View 判断某个版本是否可见。',
    '',
    '```sql',
    'START TRANSACTION;',
    'SELECT * FROM accounts WHERE id = 1;',
    'COMMIT;',
    '```',
    '',
    '| 隔离级别 | Read View |',
    '| --- | --- |',
    '| Read Committed | 每次快照读创建 |',
    '| Repeatable Read | 首次快照读创建 |',
    '',
    '面试时可以把它概括为：**版本链负责保存历史，Read View 负责判断可见性。**',
  ].join('\n');
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body:
        `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: answer } })}\n\n` +
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    });
  });
}

async function ask(page, question) {
  const composer = page.getByLabel('向 LFW AI 提问');
  await composer.fill(question);
  await composer.press('Enter');
  await page.locator('.ai-message--assistant').last().waitFor({ state: 'visible' });
  await page.locator('.ai-message--assistant').last().getByText('MVCC 的核心思路').waitFor();
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

  const welcome = await createPage();
  await ready(welcome, articlePath);
  await openAssistant(welcome);
  await capture('01-ai-welcome-1440', welcome);
  await welcome.close();

  const conversation = await createPage();
  await mockChat(conversation);
  await ready(conversation, articlePath);
  await openAssistant(conversation);
  await ask(conversation, 'MVCC 是怎么实现的？请结合代码和表格解释。');
  await capture('02-ai-long-conversation-1440', conversation);
  await conversation.close();

  const selection = await createPage();
  await mockChat(selection);
  await ready(selection, articlePath);
  const paragraph = selection.locator('.prose p').first();
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const current = window.getSelection();
    current?.removeAllRanges();
    current?.addRange(range);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await selection.getByRole('button', { name: '基于选中文字问 AI' }).click();
  await selection.locator('#lfw-ai-panel').waitFor({ state: 'visible' });
  await selection.locator('.ai-selection-context').waitFor({ state: 'visible' });
  await selection.locator('.ai-message--assistant').last().getByText('MVCC 的核心思路').waitFor();
  await capture('03-ai-selection-1440', selection);
  await selection.close();

  const dark = await createPage({ dark: true });
  await mockChat(dark);
  await ready(dark, articlePath);
  await openAssistant(dark);
  await ask(dark, 'MVCC 是怎么实现的？请结合代码和表格解释。');
  await capture('04-ai-chat-dark-1440', dark);
  await dark.close();

  const mobile = await createPage({ mobile: true });
  await ready(mobile, articlePath);
  await openAssistant(mobile);
  await capture('05-ai-bottom-sheet-390', mobile);
  await mobile.close();

  const series = await createPage();
  await ready(series, seriesPath);
  await capture('06-series-order-1440', series);
  await series.close();
} finally {
  await browser?.close();
  preview?.kill();
}
