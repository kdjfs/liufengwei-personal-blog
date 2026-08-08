import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('BaseLayout keeps article-only CSS and enhancements out of ordinary pages', async () => {
  const baseLayout = await readFile('src/layouts/BaseLayout.astro', 'utf8');
  const articlePage = await readFile('src/pages/blog/[slug].astro', 'utf8');
  const assistant = await readFile('src/components/ai/AIAssistant.tsx', 'utf8');
  const deferredAssistant = await readFile('src/components/ai/DeferredAIAssistant.astro', 'utf8');
  const deferredSearch = await readFile('src/components/interactive/DeferredSearch.astro', 'utf8');
  const homePage = await readFile('src/pages/index.astro', 'utf8');
  const continueLearning = await readFile('src/components/learning/ContinueLearning.tsx', 'utf8');

  assert.doesNotMatch(baseLayout, /katex\/dist\/katex\.min\.css/);
  assert.doesNotMatch(baseLayout, /import\('mermaid'\)|selection-speech|data-reading-progress/);
  assert.match(articlePage, /ArticleEnhancements/);
  assert.match(articlePage, /katex\/dist\/katex\.min\.css/);
  assert.doesNotMatch(assistant, /^import ['"]\.\/ai-assistant\.css['"];?$/m);
  assert.match(assistant, /ai-assistant\.css\?inline/);
  assert.doesNotMatch(continueLearning, /^import ['"]\.\/learning\.css['"];?$/m);
  assert.match(continueLearning, /learning\.css\?inline/);
  assert.match(baseLayout, /DeferredAIAssistant/);
  assert.match(baseLayout, /DeferredSearch/);
  assert.doesNotMatch(baseLayout, /SearchCommand client:|AIAssistant client:/);
  assert.match(deferredAssistant, /import\('\.\/AIAssistant'\)/);
  assert.match(deferredSearch, /import\('\.\/SearchCommand'\)/);
  assert.match(homePage, /ContinueLearning client:visible/);
});
