import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCodeLanguage } from '../../src/lib/article-code.ts';

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
