import assert from 'node:assert/strict';
import test from 'node:test';
import { CloudAccountClient } from '../../src/lib/cloud/account-client.ts';
import { normalizeApiOrigin } from '../../src/lib/cloud/config.ts';

test('cloud origins are optional, path-free, and HTTPS except on loopback', () => {
  assert.equal(normalizeApiOrigin(undefined), undefined);
  assert.equal(normalizeApiOrigin(''), undefined);
  assert.equal(normalizeApiOrigin('https://api.example.test/'), 'https://api.example.test');
  assert.equal(normalizeApiOrigin('http://api.example.test'), undefined);
  assert.equal(normalizeApiOrigin('ftp://api.example.test'), undefined);
  assert.equal(normalizeApiOrigin('http://127.0.0.1:8788'), 'http://127.0.0.1:8788');
  assert.equal(normalizeApiOrigin('https://api.example.test/v1'), undefined);
});

test('cloud account client uses credentialed session requests without exposing tokens', async () => {
  let observedUrl = '';
  let observedCredentials: RequestCredentials | undefined;
  const client = new CloudAccountClient('https://api.example.test', {
    fetch: async (input, init) => {
      observedUrl = String(input);
      observedCredentials = init?.credentials;
      return Response.json({ user: { id: 'user-a', name: 'LFW', email: 'lfw@example.test' } });
    },
  });
  const session = await client.getSession();
  assert.equal(observedUrl, 'https://api.example.test/api/auth/get-session');
  assert.equal(observedCredentials, 'include');
  assert.deepEqual(session?.user, {
    id: 'user-a',
    name: 'LFW',
    email: 'lfw@example.test',
    image: undefined,
  });
});

test('GitHub sign-in accepts only the official HTTPS authorization host', async () => {
  const accepted = new CloudAccountClient('https://api.example.test', {
    fetch: async () =>
      Response.json({ url: 'https://github.com/login/oauth/authorize?client_id=x' }),
  });
  assert.match(
    await accepted.beginGithubSignIn('https://www.example.test/learning'),
    /^https:\/\/github\.com\//,
  );

  const rejected = new CloudAccountClient('https://api.example.test', {
    fetch: async () => Response.json({ url: 'https://attacker.invalid/steal' }),
  });
  await assert.rejects(rejected.beginGithubSignIn('https://www.example.test/learning'));
});

test('sign-out is a credentialed POST and rejects server failures', async () => {
  let method = '';
  let credentials: RequestCredentials | undefined;
  const client = new CloudAccountClient('https://api.example.test', {
    fetch: async (_input, init) => {
      method = init?.method ?? '';
      credentials = init?.credentials;
      return new Response(null, { status: 204 });
    },
  });
  await client.signOut();
  assert.equal(method, 'POST');
  assert.equal(credentials, 'include');
});
