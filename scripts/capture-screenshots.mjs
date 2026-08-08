import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4330';
const outputDirectory = new URL('../docs/images/', import.meta.url);
const localBrowser = process.env.CI ? {} : { channel: 'chrome' };

await mkdir(outputDirectory, { recursive: true });
let preview;

if (!process.env.SCREENSHOT_BASE_URL) {
  preview = spawn(
    process.execPath,
    ['node_modules/astro/bin/astro.mjs', 'preview', '--host', '127.0.0.1', '--port', '4330'],
    { cwd: projectDirectory, stdio: 'inherit', shell: false },
  );
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) break;
    } catch {
      if (attempt === 39) throw new Error('Astro Preview did not become ready.');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const browser = await chromium.launch(localBrowser);

async function capturePage(name, path, viewport, prepare) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(new URL(path, baseURL).href, { waitUntil: 'networkidle' });
  await prepare?.(page);
  const png = await page.screenshot({ animations: 'disabled' });
  const outputPath = fileURLToPath(new URL(`${name}.webp`, outputDirectory));
  await sharp(png).webp({ quality: 82, effort: 5 }).toFile(outputPath);
  await page.close();
  console.log(`✓ docs/images/${name}.webp`);
}

try {
  await capturePage('home-desktop', '/', { width: 1440, height: 900 });
  await capturePage('home-mobile', '/', { width: 390, height: 844 });
  await capturePage('article', '/blog/di-yi-pian-1-3-zhang/', { width: 1440, height: 900 });
  await capturePage(
    'ai-assistant',
    '/blog/di-yi-pian-1-3-zhang/',
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByRole('button', { name: '打开 LFW AI 助手' }).click();
      await page.locator('#lfw-ai-panel').waitFor({ state: 'visible' });
    },
  );
  await capturePage('learning', '/learning/', { width: 1440, height: 900 });
} finally {
  await browser.close();
  preview?.kill();
}
