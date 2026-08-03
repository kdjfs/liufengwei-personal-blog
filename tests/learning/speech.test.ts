import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_LISTENING_PROMPT_VERSION,
  buildAudioScriptCacheKey,
  fingerprintText,
} from '../../src/lib/speech/ai-script.ts';
import { SPEECH_RATES } from '../../src/lib/speech/speech-engine.ts';
import { normalizeSpeechBlocks, segmentSpeechText } from '../../src/lib/speech/text-normalizer.ts';

test('article speech skips code blocks with a useful language announcement', () => {
  const segments = normalizeSpeechBlocks([
    { kind: 'heading', text: '索引', heading: '索引' },
    { kind: 'paragraph', text: '先理解 EXPLAIN 与联合索引。', heading: '索引' },
    { kind: 'code', text: 'SELECT * FROM users', language: 'sql', heading: '索引' },
  ]);
  assert.match(segments.map((item) => item.text).join(''), /EXPLAIN/);
  assert.match(segments.map((item) => item.text).join(''), /这里有一段 SQL 示例代码，已跳过。/);
  assert.doesNotMatch(segments.map((item) => item.text).join(''), /SELECT \*/);
});

test('speech text is split into safe 150 to 350 character segments when possible', () => {
  const source = Array.from(
    { length: 30 },
    (_, index) => `这是第${index + 1}个用于测试朗读分段的完整句子，包含足够清晰的停顿。`,
  ).join('');
  const segments = segmentSpeechText(source);
  assert.ok(segments.length > 1);
  assert.ok(segments.every((segment) => segment.length <= 350));
  assert.ok(segments.slice(0, -1).every((segment) => segment.length >= 150));
});

test('speech exposes the six required playback rates', () => {
  assert.deepEqual(SPEECH_RATES, [0.75, 1, 1.25, 1.5, 1.75, 2]);
});

test('AI listening cache key changes with article content or prompt version', () => {
  const first = buildAudioScriptCacheKey(
    'mvcc',
    fingerprintText('版本一'),
    AI_LISTENING_PROMPT_VERSION,
  );
  const second = buildAudioScriptCacheKey(
    'mvcc',
    fingerprintText('版本二'),
    AI_LISTENING_PROMPT_VERSION,
  );
  assert.notEqual(first, second);
  assert.match(first, /^mvcc:/);
});
