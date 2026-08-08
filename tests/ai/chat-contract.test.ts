import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHAT_LIMITS,
  fitChatRequest,
  truncateUnicode,
  unicodeLength,
} from '../../src/lib/ai/chat-contract.ts';

test('unicodeLength counts Unicode code points for Chinese, English, mixed text, and emoji', () => {
  assert.equal(unicodeLength('中文'), 2);
  assert.equal(unicodeLength('English'), 7);
  assert.equal(unicodeLength('中A🙂'), 3);
  assert.equal(unicodeLength('🙂'.repeat(10)), 10);
});

test('truncateUnicode preserves complete emoji at and beyond the boundary', () => {
  const atBoundary = `中文${'🙂'.repeat(CHAT_LIMITS.selectionText - 2)}`;
  assert.equal(truncateUnicode(atBoundary, CHAT_LIMITS.selectionText), atBoundary);

  const overBoundary = `${atBoundary}END`;
  const truncated = truncateUnicode(overBoundary, CHAT_LIMITS.selectionText);
  assert.equal(unicodeLength(truncated), CHAT_LIMITS.selectionText);
  assert.equal(truncated.endsWith('🙂'), true);
  assert.equal(Array.from(truncated).at(-1), '🙂');
});

test('fitChatRequest applies the same limits to every client-controlled text field', () => {
  const long = '中A🙂'.repeat(6_000);
  const payload = fitChatRequest({
    mode: 'deep',
    messages: [{ role: 'user', content: long }],
    context: [{ id: long, title: long, url: `/${long}`, category: long, excerpt: long }],
    structuredFacts: long,
    currentPage: {
      title: long,
      url: `/${long}`,
      description: long,
      category: long,
      tags: Array.from({ length: 12 }, () => long),
      content: long,
      activeHeading: long,
      readingProgress: 72,
    },
    selection: {
      text: long,
      headingId: long,
      headingText: long,
      surroundingText: long,
      articleSlug: long,
      annotationNote: long,
    },
  });

  assert.equal(unicodeLength(payload.messages[0]?.content ?? ''), CHAT_LIMITS.messageContent);
  assert.equal(unicodeLength(payload.context[0]?.excerpt ?? ''), CHAT_LIMITS.contextExcerpt);
  assert.equal(unicodeLength(payload.currentPage?.content ?? ''), CHAT_LIMITS.currentPageContent);
  assert.equal(unicodeLength(payload.selection?.text ?? ''), CHAT_LIMITS.selectionText);
  assert.equal(unicodeLength(payload.selection?.annotationNote ?? ''), CHAT_LIMITS.annotationNote);
  assert.equal(payload.currentPage?.tags?.length, CHAT_LIMITS.currentPageTags);
});

test('fitChatRequest bounds conversation history by total Unicode length without splitting emoji', () => {
  const content = '🙂'.repeat(CHAT_LIMITS.messageContent);
  const payload = fitChatRequest({
    mode: 'fast',
    messages: Array.from({ length: CHAT_LIMITS.messages }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content,
    })),
    context: [],
  });

  const total = payload.messages.reduce((sum, message) => sum + unicodeLength(message.content), 0);
  assert.equal(total, CHAT_LIMITS.totalMessageContent);
  assert.equal(payload.messages.at(-1)?.role, 'user');
});
