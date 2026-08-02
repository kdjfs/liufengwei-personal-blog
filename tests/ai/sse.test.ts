import assert from 'node:assert/strict';
import test from 'node:test';
import { AnthropicSSEDecoder } from '../../src/lib/ai/sse.ts';

test('AnthropicSSEDecoder emits only final text deltas across arbitrary chunks', () => {
  const decoder = new AnthropicSSEDecoder();
  const chunks = [
    ': keep-alive\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"private"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Vue3 "}}\n',
    '\nevent: content_block_delta\r\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Diff"}}\r\n\r\n',
    'event: message_stop\ndata: {"type":"message_stop"}\n\n',
  ];

  const output = chunks.flatMap((chunk) => decoder.push(chunk));

  assert.deepEqual(output, ['Vue3 ', 'Diff']);
  assert.equal(decoder.done, true);
});

test('AnthropicSSEDecoder preserves an incomplete event until the next chunk', () => {
  const decoder = new AnthropicSSEDecoder();
  assert.deepEqual(decoder.push('event: content_block_delta\ndata: {"type":"content_'), []);
  assert.deepEqual(decoder.push('block_delta","delta":{"type":"text_delta","text":"完成"}}\n\n'), [
    '完成',
  ]);
});
