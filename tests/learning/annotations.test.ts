import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTextQuoteAnchor, findTextQuoteOffset } from '../../src/lib/learning/annotations.ts';

test('text quote anchor stores exact text with stable prefix and suffix context', () => {
  const text = '事务开始后，MVCC 会通过 Read View 判断可见性，而不是简单地依赖锁。';
  const start = text.indexOf('MVCC');
  const anchor = buildTextQuoteAnchor(text, start, start + 4, 12);
  assert.deepEqual(anchor, {
    exact: 'MVCC',
    prefix: '事务开始后，',
    suffix: ' 会通过 Read Vi',
  });
});

test('text quote matching prefers the occurrence with matching prefix and suffix', () => {
  const text = '概念 MVCC 很重要。事务里 MVCC 会通过 Read View 判断可见性。';
  const offset = findTextQuoteOffset(text, {
    exact: 'MVCC',
    prefix: '。事务里 ',
    suffix: ' 会通过 Read View',
  });
  assert.equal(offset, text.lastIndexOf('MVCC'));
});

test('text quote matching falls back to exact text after nearby prose changes', () => {
  assert.equal(
    findTextQuoteOffset('新的开头，但 MVCC 仍然存在。', {
      exact: 'MVCC',
      prefix: '旧前文',
      suffix: '旧后文',
    }),
    7,
  );
});
