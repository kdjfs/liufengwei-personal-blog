import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveChatEndpoint } from '../../src/lib/ai/chat-endpoint.ts';

test('resolveChatEndpoint uses the local gateway only for loopback browser hosts', () => {
  assert.equal(resolveChatEndpoint('localhost'), 'http://127.0.0.1:8787/api/chat');
  assert.equal(resolveChatEndpoint('127.0.0.1'), 'http://127.0.0.1:8787/api/chat');
  assert.equal(resolveChatEndpoint('liufengwei-personal-blog.vercel.app'), '/api/chat');
});

test('resolveChatEndpoint switches to Node AI only through an explicit path-free origin', () => {
  assert.equal(
    resolveChatEndpoint('www.example.test', 'https://api.example.test'),
    'https://api.example.test/api/v1/ai/chat',
  );
  assert.equal(
    resolveChatEndpoint('www.example.test', 'https://api.example.test/'),
    'https://api.example.test/api/v1/ai/chat',
  );
  assert.equal(resolveChatEndpoint('www.example.test', 'https://api.example.test/v1'), '/api/chat');
  assert.equal(resolveChatEndpoint('www.example.test', 'http://api.example.test'), '/api/chat');
});
