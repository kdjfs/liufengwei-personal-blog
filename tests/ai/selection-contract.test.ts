import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ZodError } from 'zod';
import {
  AI_LIMITS,
  chatRequestSchema,
  contextSchema,
  currentPageSchema,
  messageSchema,
  normalizeChatPayload,
  normalizeSelectionContext,
  selectionSchema,
  truncateCodePoints,
} from '../../src/lib/ai/chat-contract.ts';

// ---- Unicode-safe truncate ----

describe('truncateCodePoints', () => {
  it('preserves short text', () => {
    assert.equal(truncateCodePoints('hello', 10), 'hello');
  });

  it('truncates at code-point boundary', () => {
    const emoji = '👍'.repeat(100);
    assert.ok(Array.from(truncateCodePoints(emoji, 5)).length <= 5);
  });

  it('handles mixed CJK + Latin correctly', () => {
    const text = 'MySQL 的 MVCC 和 Redis cache';
    const truncated = truncateCodePoints(text, 3000);
    assert.equal(truncated, text);
  });
});

// ---- Selection schema ----

describe('selectionSchema', () => {
  it('accepts minimal selection', () => {
    const result = selectionSchema.parse({ text: 'hello' });
    assert.equal(result.text, 'hello');
  });

  it('accepts full selection context (Chinese)', () => {
    const result = selectionSchema.parse({
      text: 'MVCC 的核心是通过多版本数据实现并发读写。',
      headingId: 'section-mvcc',
      headingText: 'MySQL MVCC',
      surroundingText: 'InnoDB 使用 MVCC 来实现事务隔离...',
      articleSlug: 'di-san-zhang-mysql-shi-wu-mvcc-yu-suo',
    });
    assert.equal(result.text, 'MVCC 的核心是通过多版本数据实现并发读写。');
  });

  it('accepts full selection context (English)', () => {
    const result = selectionSchema.parse({
      text: 'InnoDB uses a B+ Tree index.',
      headingId: 'innodb-index',
      headingText: 'InnoDB Index Types',
      surroundingText: 'MySQL supports several index types...',
      articleSlug: 'di-er-zhang-mysql-suo-yin',
    });
    assert.equal(result.text, 'InnoDB uses a B+ Tree index.');
  });

  it('accepts mixed Chinese-English selection', () => {
    const result = selectionSchema.parse({
      text: 'MySQL 的 MVCC 和 Redis cache 有什么区别？',
      headingId: 'mvcc-cache',
      headingText: 'MVCC 与缓存',
      surroundingText: '数据库缓存策略对比...',
      articleSlug: 'di-liu-zhang-mysql-redis-zong-gang',
    });
    assert.equal(result.text, 'MySQL 的 MVCC 和 Redis cache 有什么区别？');
  });

  it('accepts selection with annotation note', () => {
    const result = selectionSchema.parse({
      text: 'MVCC 通过 undo log 实现多版本。',
      headingId: 'undo-log',
      headingText: 'Undo Log',
      articleSlug: 'di-san-zhang-mysql-shi-wu-mvcc-yu-suo',
      annotationNote: '我的理解：MVCC 就是保存旧版本数据，让读操作不阻塞写操作。',
    });
    assert.equal(
      result.annotationNote,
      '我的理解：MVCC 就是保存旧版本数据，让读操作不阻塞写操作。',
    );
  });

  it('accepts selection at 3000-char boundary', () => {
    const text = 'a'.repeat(AI_LIMITS.selection);
    const result = selectionSchema.parse({ text });
    assert.equal(result.text.length, AI_LIMITS.selection);
  });

  it('rejects overly long selection text', () => {
    assert.throws(
      () => selectionSchema.parse({ text: 'a'.repeat(AI_LIMITS.selection + 1) }),
      ZodError,
    );
  });

  it('rejects empty text', () => {
    assert.throws(() => selectionSchema.parse({ text: '' }), ZodError);
    assert.throws(() => selectionSchema.parse({ text: '   ' }), ZodError);
  });

  it('rejects extra unknown fields (strict)', () => {
    assert.throws(() => selectionSchema.parse({ text: 'hello', unknownField: 42 }), ZodError);
  });
});

// ---- Context schema ----

describe('contextSchema', () => {
  it('accepts valid context', () => {
    const result = contextSchema.parse({
      id: 'abc123',
      title: '第三章：MySQL 事务、MVCC 与锁',
      url: '/blog/di-san-zhang-mysql-shi-wu-mvcc-yu-suo',
      category: '后端',
      excerpt: 'InnoDB 事务隔离级别与 MVCC 实现原理。',
    });
    assert.equal(result.id, 'abc123');
  });

  it('rejects excerpt longer than limit', () => {
    assert.throws(
      () =>
        contextSchema.parse({
          id: 'abc',
          title: 'Test',
          url: '/blog/test',
          category: 'test',
          excerpt: 'x'.repeat(AI_LIMITS.contextExcerpt + 1),
        }),
      ZodError,
    );
  });

  it('rejects empty excerpt', () => {
    assert.throws(
      () =>
        contextSchema.parse({
          id: 'abc',
          title: 'Test',
          url: '/blog/test',
          category: 'test',
          excerpt: '',
        }),
      ZodError,
    );
  });
});

// ---- Current page schema ----

describe('currentPageSchema', () => {
  it('accepts full article page context', () => {
    const result = currentPageSchema.parse({
      title: '第三章：MySQL 事务、MVCC 与锁',
      url: '/blog/di-san-zhang-mysql-shi-wu-mvcc-yu-suo',
      description: '深入理解 MySQL 事务隔离与 MVCC。',
      category: '后端',
      tags: ['MySQL', '事务'],
      content: 'MySQL 事务隔离级别包括 READ UNCOMMITTED...',
      activeHeading: 'MVCC 实现原理',
      readingProgress: 45,
    });
    assert.equal(result.title, '第三章：MySQL 事务、MVCC 与锁');
  });

  it('rejects empty title', () => {
    assert.throws(() => currentPageSchema.parse({ title: '', url: '/blog/test' }), ZodError);
  });

  it('rejects non-path URL', () => {
    assert.throws(
      () => currentPageSchema.parse({ title: 'Test', url: 'https://example.com' }),
      ZodError,
    );
  });
});

// ---- Complete chat request ----

describe('chatRequestSchema', () => {
  it('accepts full selection ask request', () => {
    const payload = normalizeChatPayload({
      mode: 'fast',
      messages: [{ role: 'user', content: '请解释我选中的这段内容。' }],
      context: [
        {
          id: 'di-san-zhang-mysql',
          title: '第三章：MySQL 事务、MVCC 与锁',
          url: '/blog/di-san-zhang-mysql-shi-wu-mvcc-yu-suo',
          category: '后端',
          excerpt: 'InnoDB 事务隔离级别与 MVCC 实现原理。',
        },
      ],
      currentPage: {
        title: '第三章：MySQL 事务、MVCC 与锁',
        url: '/blog/di-san-zhang-mysql-shi-wu-mvcc-yu-suo',
        description: '深入理解 MySQL 事务隔离与 MVCC',
        category: '后端',
        tags: ['MySQL', '事务', 'Redis'],
        content: 'MySQL 事务隔离级别...'.repeat(50),
        activeHeading: 'MVCC 实现原理',
        readingProgress: 45,
      },
      selection: {
        text: 'MVCC 的核心是通过多版本数据实现并发读写。',
        headingId: 'section-mvcc',
        headingText: 'MVCC 实现原理',
        surroundingText: 'InnoDB 使用 MVCC 来实现事务隔离，通过 undo log 保存旧版本数据。',
        articleSlug: 'di-san-zhang-mysql-shi-wu-mvcc-yu-suo',
      },
    });

    const parsed = chatRequestSchema.parse(payload);
    assert.equal(parsed.mode, 'fast');
    assert.equal(parsed.selection?.text, 'MVCC 的核心是通过多版本数据实现并发读写。');
    assert.equal(parsed.context[0].id, 'di-san-zhang-mysql');
  });

  it('accepts large excerpt from chunk text (edge case)', () => {
    // Simulate chunk text being used as context excerpt
    const chunkText = 'InnoDB '.repeat(500); // ~3500 chars, exceeds 1800 limit
    const payload = normalizeChatPayload({
      mode: 'fast',
      messages: [{ role: 'user', content: 'Explain.' }],
      context: [
        {
          id: 'test-id',
          title: 'Test Article',
          url: '/blog/test',
          category: '后端',
          excerpt: chunkText,
        },
      ],
      currentPage: {
        title: 'Test Article',
        url: '/blog/test',
      },
      selection: {
        text: 'Test selection.',
      },
    });

    const parsed = chatRequestSchema.parse(payload);
    // normalizeChatPayload should truncate excerpt to AI_LIMITS.contextExcerpt
    assert.ok(parsed.context[0].excerpt.length <= AI_LIMITS.contextExcerpt);
  });

  it('normalizes overly long page content', () => {
    const payload = normalizeChatPayload({
      mode: 'fast',
      messages: [{ role: 'user', content: 'Question.' }],
      context: [],
      currentPage: {
        title: 'Long Article',
        url: '/blog/long',
        content: 'x'.repeat(AI_LIMITS.pageContent + 1000),
      },
      selection: {
        text: 'Selected.',
      },
    });

    const parsed = chatRequestSchema.parse(payload);
    const content = parsed.currentPage?.content ?? '';
    assert.ok(
      content.length <= AI_LIMITS.pageContent,
      `content length ${content.length} exceeds limit ${AI_LIMITS.pageContent}`,
    );
  });

  it('normalizes overly long structuredFacts', () => {
    const payload = normalizeChatPayload({
      mode: 'fast',
      messages: [{ role: 'user', content: 'Question.' }],
      context: [],
      structuredFacts: 'x'.repeat(AI_LIMITS.structuredFacts + 2000),
      currentPage: {
        title: 'Test',
        url: '/blog/test',
      },
      selection: {
        text: 'Selected.',
      },
    });

    const parsed = chatRequestSchema.parse(payload);
    const facts = parsed.structuredFacts ?? '';
    assert.ok(
      facts.length <= AI_LIMITS.structuredFacts,
      `structuredFacts length ${facts.length} exceeds limit`,
    );
  });

  it('handles empty context gracefully', () => {
    const payload = normalizeChatPayload({
      mode: 'fast',
      messages: [{ role: 'user', content: 'Question.' }],
      context: [],
      currentPage: {
        title: 'Test',
        url: '/blog/test',
      },
      selection: {
        text: 'Selected.',
      },
    });

    const parsed = chatRequestSchema.parse(payload);
    assert.deepEqual(parsed.context, []);
  });

  it('filters out invalid context entries', () => {
    const payload = normalizeChatPayload({
      mode: 'fast',
      messages: [{ role: 'user', content: 'Question.' }],
      context: [
        { id: '', title: '', url: '', category: '', excerpt: '' },
        { id: 'valid', title: 'Valid', url: '/blog/valid', category: 'cat', excerpt: 'Excerpt.' },
      ],
      currentPage: {
        title: 'Test',
        url: '/blog/test',
      },
      selection: {
        text: 'Selected.',
      },
    });

    const parsed = chatRequestSchema.parse(payload);
    assert.equal(parsed.context.length, 1);
    assert.equal(parsed.context[0].id, 'valid');
  });

  it('accepts request with no selection (normal chat)', () => {
    const payload = normalizeChatPayload({
      mode: 'fast',
      messages: [{ role: 'user', content: 'What is MySQL?' }],
      context: [],
      currentPage: {
        title: 'Test',
        url: '/blog/test',
      },
    });

    const parsed = chatRequestSchema.parse(payload);
    assert.equal(parsed.selection, undefined);
  });
});

// ---- normalizeSelectionContext edge cases ----

describe('normalizeSelectionContext', () => {
  it('handles undefined fields gracefully', () => {
    const result = normalizeSelectionContext({ text: 'hello' });
    assert.equal(result.text, 'hello');
    assert.equal(result.headingId, undefined);
    assert.equal(result.headingText, undefined);
    assert.equal(result.surroundingText, undefined);
    assert.equal(result.articleSlug, undefined);
    assert.equal(result.annotationNote, undefined);
  });

  it('truncates headingId', () => {
    const result = normalizeSelectionContext({
      text: 'hello',
      headingId: 'x'.repeat(AI_LIMITS.headingId + 100),
    });
    assert.ok(result.headingId && result.headingId.length <= AI_LIMITS.headingId);
  });

  it('truncates surroundingText', () => {
    const result = normalizeSelectionContext({
      text: 'hello',
      surroundingText: 'x'.repeat(AI_LIMITS.surrounding + 500),
    });
    assert.ok(result.surroundingText && result.surroundingText.length <= AI_LIMITS.surrounding);
  });
});

// ---- messageSchema ----

describe('messageSchema', () => {
  it('accepts valid message', () => {
    const result = messageSchema.parse({ role: 'user', content: 'Hello' });
    assert.equal(result.role, 'user');
  });

  it('rejects message over limit', () => {
    assert.throws(
      () => messageSchema.parse({ role: 'user', content: 'x'.repeat(AI_LIMITS.message + 1) }),
      ZodError,
    );
  });
});
