import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.ts';
import { parseServerConfig } from '../src/config.ts';

const environment = {
  NODE_ENV: 'test',
  API_PORT: '8788',
  API_ORIGIN: 'http://127.0.0.1:8788',
  DATABASE_URL: 'mysql://lfw:password@127.0.0.1:3306/lfw_test',
  REDIS_URL: 'redis://127.0.0.1:6379/1',
  WEB_ORIGIN: 'http://127.0.0.1:4321',
  SESSION_SECRET: 'test-session-secret-at-least-32-characters',
};

function probes(overrides: Partial<Record<'mysql' | 'redis', () => Promise<void>>> = {}) {
  return {
    mysql: { check: overrides.mysql ?? (async () => undefined) },
    redis: { check: overrides.redis ?? (async () => undefined) },
  };
}

test('config accepts a complete test environment and normalizes URLs', () => {
  const config = parseServerConfig(environment);

  assert.equal(config.nodeEnv, 'test');
  assert.equal(config.port, 8788);
  assert.equal(config.apiOrigin, environment.API_ORIGIN);
  assert.equal(config.webOrigin, 'http://127.0.0.1:4321');
  assert.equal(config.databaseUrl, environment.DATABASE_URL);
});

test('config rejects weak production secrets, insecure origins, and partial OAuth settings', () => {
  assert.throws(() =>
    parseServerConfig({
      ...environment,
      NODE_ENV: 'production',
      WEB_ORIGIN: 'http://example.com',
      SESSION_SECRET: 'short',
    }),
  );
  assert.throws(() =>
    parseServerConfig({
      ...environment,
      GITHUB_CLIENT_ID: 'client-only',
    }),
  );
  assert.throws(() =>
    parseServerConfig({
      ...environment,
      API_ORIGIN: 'http://127.0.0.1:8788/untrusted-path',
    }),
  );
});

test('config rejects example credentials in production without exposing their values', () => {
  const productionEnvironment = {
    ...environment,
    NODE_ENV: 'production',
    API_ORIGIN: 'https://api.example.com',
    WEB_ORIGIN: 'https://www.example.com',
    DATABASE_URL: 'mysql://lfw:strong-database-password@db.internal:3306/lfw',
    REDIS_URL: 'rediss://cache.internal:6379/0',
    SESSION_SECRET: 'production-session-secret-with-enough-entropy',
  };

  for (const overrides of [
    { SESSION_SECRET: 'replace_with_at_least_32_random_characters' },
    { DATABASE_URL: 'mysql://lfw:replace_me@db.internal:3306/lfw' },
    { GITHUB_CLIENT_ID: 'replace_me', GITHUB_CLIENT_SECRET: 'replace_me' },
    { DEEPSEEK_API_KEY: 'replace_me' },
  ]) {
    assert.throws(
      () => parseServerConfig({ ...productionEnvironment, ...overrides }),
      (error: unknown) => {
        assert.equal(error instanceof Error ? error.message : '', 'Server environment is invalid');
        assert.equal(String(error).includes('replace_me'), false);
        return true;
      },
    );
  }
});

test('liveness does not touch dependencies and ignores caller supplied request IDs', async () => {
  let checks = 0;
  const app = await buildApp({
    config: parseServerConfig(environment),
    probes: probes({
      mysql: async () => {
        checks += 1;
      },
      redis: async () => {
        checks += 1;
      },
    }),
  });

  const response = await app.inject({
    method: 'GET',
    url: '/health/live',
    headers: { 'x-request-id': 'attacker-controlled' },
  });
  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'ok');
  assert.notEqual(body.requestId, 'attacker-controlled');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(checks, 0);
  await app.close();
});

test('readiness reports healthy dependencies without exposing connection details', async () => {
  const app = await buildApp({
    config: parseServerConfig(environment),
    probes: probes(),
  });

  const response = await app.inject({ method: 'GET', url: '/health/ready' });
  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.deepEqual(body.components, { mysql: 'up', redis: 'up' });
  assert.equal(JSON.stringify(body).includes('127.0.0.1'), false);
  assert.equal(JSON.stringify(body).includes('password'), false);
  await app.close();
});

test('readiness checks every dependency and returns a safe 503 when one is down', async () => {
  let redisChecked = false;
  const app = await buildApp({
    config: parseServerConfig(environment),
    probes: probes({
      mysql: async () => {
        throw new Error(`cannot connect to ${environment.DATABASE_URL}`);
      },
      redis: async () => {
        redisChecked = true;
      },
    }),
  });

  const response = await app.inject({ method: 'GET', url: '/health/ready' });
  const body = response.json();

  assert.equal(response.statusCode, 503);
  assert.equal(body.status, 'not_ready');
  assert.deepEqual(body.components, { mysql: 'down', redis: 'up' });
  assert.equal(JSON.stringify(body).includes('cannot connect'), false);
  assert.equal(redisChecked, true);
  await app.close();
});

test('CORS is credentialed only for the configured Web origin', async () => {
  const app = await buildApp({
    config: parseServerConfig(environment),
    probes: probes(),
  });

  const trusted = await app.inject({
    method: 'GET',
    url: '/health/live',
    headers: { origin: environment.WEB_ORIGIN },
  });
  const untrusted = await app.inject({
    method: 'GET',
    url: '/health/live',
    headers: { origin: 'https://attacker.invalid' },
  });

  assert.equal(trusted.headers['access-control-allow-origin'], environment.WEB_ORIGIN);
  assert.equal(trusted.headers['access-control-allow-credentials'], 'true');
  assert.equal(untrusted.headers['access-control-allow-origin'], undefined);
  await app.close();
});

test('unknown routes use the uniform error contract and the configured body limit is bounded', async () => {
  const app = await buildApp({
    config: parseServerConfig(environment),
    probes: probes(),
  });

  const response = await app.inject({ method: 'GET', url: '/missing' });
  const body = response.json();

  assert.equal(app.initialConfig.bodyLimit, 64 * 1024);
  assert.equal(response.statusCode, 404);
  assert.deepEqual(Object.keys(body.error).sort(), ['code', 'message', 'requestId']);
  assert.equal(body.error.code, 'NOT_FOUND');
  await app.close();
});

test('auth routes use the configured API origin and preserve security cookies', async () => {
  let observedUrl = '';
  let observedBody = '';
  const app = await buildApp({
    config: parseServerConfig(environment),
    probes: probes(),
    auth: {
      async handler(request) {
        observedUrl = request.url;
        observedBody = await request.text();
        return new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'lfw-space.session=test; Path=/; HttpOnly; SameSite=Lax',
          },
        });
      },
    },
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/example?mode=test',
    headers: {
      host: 'attacker.invalid',
      origin: environment.WEB_ORIGIN,
      'content-type': 'application/json',
    },
    payload: { hello: 'world' },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(observedUrl, `${environment.API_ORIGIN}/api/auth/example?mode=test`);
  assert.deepEqual(JSON.parse(observedBody), { hello: 'world' });
  assert.match(String(response.headers['set-cookie']), /HttpOnly/);
  assert.match(String(response.headers['set-cookie']), /SameSite=Lax/);
  await app.close();
});
