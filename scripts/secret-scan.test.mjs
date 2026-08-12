import assert from 'node:assert/strict';
import test from 'node:test';
import { findSecrets } from './secret-scan.mjs';

test('secret scan detects provider tokens, private keys, and literal production secrets', () => {
  const githubToken = `gh${'p_'}${'A'.repeat(36)}`;
  const privateKey = `-----BEGIN ${'PRIVATE KEY'}-----`;
  assert.equal(findSecrets('fixture.txt', githubToken).length, 1);
  assert.equal(findSecrets('fixture.txt', privateKey).length, 1);
  assert.equal(
    findSecrets('fixture.env', `${'SESSION'}_SECRET=correct-horse-battery-staple`).length,
    1,
  );
});

test('secret scan allows documented placeholders and isolated test/local credentials', () => {
  const safe = [
    'SESSION_SECRET=replace_with_at_least_32_random_characters',
    'MYSQL_PASSWORD=lfw_test_only',
    'MYSQL_ROOT_PASSWORD=lfw_root_local_only',
    'PUBLIC_AI_API_URL=',
  ].join('\n');
  assert.deepEqual(findSecrets('.env.example', safe), []);
});
