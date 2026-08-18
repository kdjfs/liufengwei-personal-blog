import assert from 'node:assert/strict';
import test from 'node:test';
import { copyText, formatCodeLanguage } from '../../src/lib/article-code.ts';

test('code copy uses the modern Clipboard API without invoking the fallback', async () => {
  const calls: string[] = [];

  const copied = await copyText('const answer = 42;', {
    writeText: async (text) => calls.push(`clipboard:${text}`),
    fallbackCopy: () => {
      calls.push('fallback');
      return true;
    },
  });

  assert.equal(copied, true);
  assert.deepEqual(calls, ['clipboard:const answer = 42;']);
});

test('code copy preserves the legacy fallback when Clipboard API access fails', async () => {
  const calls: string[] = [];

  const copied = await copyText('fallback text', {
    writeText: async () => {
      calls.push('clipboard');
      throw new Error('permission denied');
    },
    fallbackCopy: (text) => {
      calls.push(`fallback:${text}`);
      return true;
    },
  });

  assert.equal(copied, true);
  assert.deepEqual(calls, ['clipboard', 'fallback:fallback text']);
});

test('code block language labels use reader-friendly canonical names', () => {
  assert.equal(formatCodeLanguage('js'), 'JAVASCRIPT');
  assert.equal(formatCodeLanguage('javascript'), 'JAVASCRIPT');
  assert.equal(formatCodeLanguage('ts'), 'TYPESCRIPT');
  assert.equal(formatCodeLanguage('typescript'), 'TYPESCRIPT');
  assert.equal(formatCodeLanguage('tsx'), 'TSX');
  assert.equal(formatCodeLanguage('bash'), 'BASH');
  assert.equal(formatCodeLanguage('shell'), 'BASH');
  assert.equal(formatCodeLanguage('sql'), 'SQL');
  assert.equal(formatCodeLanguage('json'), 'JSON');
});

test('code block language labels fall back to TEXT when metadata is absent', () => {
  assert.equal(formatCodeLanguage(), 'TEXT');
  assert.equal(formatCodeLanguage(''), 'TEXT');
  assert.equal(formatCodeLanguage('plaintext'), 'TEXT');
  assert.equal(formatCodeLanguage('text'), 'TEXT');
});

test('unknown Shiki language identifiers remain visible instead of being discarded', () => {
  assert.equal(formatCodeLanguage('graphql'), 'GRAPHQL');
  assert.equal(formatCodeLanguage('c++'), 'C++');
});
