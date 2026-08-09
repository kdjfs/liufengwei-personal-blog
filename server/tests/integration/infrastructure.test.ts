import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import { createClient } from 'redis';
import { buildApp } from '../../src/app.ts';
import { createAuth } from '../../src/auth.ts';
import { parseServerConfig } from '../../src/config.ts';
import { createDatabasePool } from '../../src/db/client.ts';
import { migrateDatabase } from '../../src/db/migrate.ts';
import { createInfrastructure } from '../../src/infrastructure.ts';

const databaseUrl = process.env.LFW_TEST_DATABASE_URL;
const redisUrl = process.env.LFW_TEST_REDIS_URL;
const databaseSkip = databaseUrl ? false : 'LFW_TEST_DATABASE_URL is not configured';
const redisSkip = redisUrl ? false : 'LFW_TEST_REDIS_URL is not configured';
const infrastructureSkip = databaseUrl && redisUrl ? false : 'integration URLs are not configured';
const migrationTestName = 'initial migration is repeatable and keeps identifiers binary';
const redisTestName = 'Redis provides only ephemeral coordination primitives';
const readinessTestName = 'Fastify readiness uses real MySQL and Redis probes';
const authTestName = 'Better Auth persists GitHub OAuth state with secure cookies';
const insertUserSql = 'insert into users (id, name, email, email_verified) values (?, ?, ?, ?)';
const insertSessionSql =
  'insert into sessions (id, user_id, token, expires_at) values (?, ?, ?, ?)';

interface TableRow extends RowDataPacket {
  tableName: string;
}

interface CountRow extends RowDataPacket {
  count: number;
}

function assertSafeTestDatabase(value: string): void {
  const url = new URL(value);
  const database = url.pathname.slice(1);
  assert.equal(url.protocol, 'mysql:');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.match(database, /_test$/);
}

function requireTestUrl(value: string | undefined, name: string): string {
  assert.ok(value, `${name} is required for this integration test`);
  return value;
}

test(migrationTestName, { skip: databaseSkip }, async () => {
  const testDatabaseUrl = requireTestUrl(databaseUrl, 'LFW_TEST_DATABASE_URL');
  assertSafeTestDatabase(testDatabaseUrl);
  await migrateDatabase(testDatabaseUrl);
  await migrateDatabase(testDatabaseUrl);

  const pool = createDatabasePool(testDatabaseUrl);
  try {
    const expectedTables = [
      'ai_conversations',
      'ai_messages',
      'annotations',
      'favorites',
      'learning_progress_devices',
      'oauth_accounts',
      'sessions',
      'sync_operations',
      'user_preferences',
      'users',
      'verifications',
    ];
    const [tableRows] = await pool.query<TableRow[]>(
      `select table_name as tableName
           from information_schema.tables
          where table_schema = database()
            and table_name in (${expectedTables.map(() => '?').join(',')})`,
      expectedTables,
    );
    assert.deepEqual(tableRows.map((row) => row.tableName).sort(), expectedTables);

    const userId = randomUUID();
    const userValues = [userId, 'Integration User', `${userId}@example.invalid`, false];
    await pool.execute(insertUserSql, userValues);
    const sessionExpiry = new Date(Date.now() + 60_000);
    const upperSession = [randomUUID(), userId, 'CaseSensitiveToken', sessionExpiry];
    const lowerSession = [randomUUID(), userId, 'casesensitivetoken', sessionExpiry];
    await pool.execute(insertSessionSql, upperSession);
    await pool.execute(insertSessionSql, lowerSession);
    await pool.execute('delete from users where id = ?', [userId]);

    const [sessionRows] = await pool.query<CountRow[]>(
      'select count(*) as count from sessions where user_id = ?',
      [userId],
    );
    assert.equal(Number(sessionRows[0]?.count), 0);
  } finally {
    await pool.end();
  }
});

test(redisTestName, { skip: redisSkip }, async () => {
  const testRedisUrl = requireTestUrl(redisUrl, 'LFW_TEST_REDIS_URL');
  const url = new URL(testRedisUrl);
  assert.equal(url.protocol, 'redis:');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));

  const redis = createClient({ url: testRedisUrl });
  redis.on('error', () => undefined);
  await redis.connect();
  try {
    assert.equal(await redis.ping(), 'PONG');
    const key = `lfw:test:lease:${randomUUID()}`;
    const leaseOptions = { expiration: { type: 'EX', value: 5 }, condition: 'NX' } as const;
    assert.equal(await redis.set(key, 'owner-a', leaseOptions), 'OK');
    assert.equal(await redis.set(key, 'owner-b', leaseOptions), null);
    await redis.del(key);
  } finally {
    await redis.quit();
  }
});

test(readinessTestName, { skip: infrastructureSkip }, async () => {
  const config = parseServerConfig({
    NODE_ENV: 'test',
    API_ORIGIN: 'http://127.0.0.1:8788',
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    WEB_ORIGIN: 'http://127.0.0.1:4321',
    SESSION_SECRET: 'integration-session-secret-at-least-32-characters',
  });
  const infrastructure = createInfrastructure(config);
  const app = await buildApp({ config, probes: infrastructure.probes, probeTimeoutMs: 2_000 });
  try {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().components, { mysql: 'up', redis: 'up' });
  } finally {
    await app.close();
    await infrastructure.close();
  }
});

test(authTestName, { skip: databaseSkip }, async () => {
  const testDatabaseUrl = requireTestUrl(databaseUrl, 'LFW_TEST_DATABASE_URL');
  await migrateDatabase(testDatabaseUrl);
  const config = parseServerConfig({
    NODE_ENV: 'production',
    API_ORIGIN: 'https://api.example.test',
    DATABASE_URL: testDatabaseUrl,
    REDIS_URL: 'redis://127.0.0.1:36380/0',
    WEB_ORIGIN: 'https://www.example.test',
    GITHUB_CLIENT_ID: 'github-test-client',
    GITHUB_CLIENT_SECRET: 'github-test-secret',
    SESSION_SECRET: 'integration-session-secret-at-least-32-characters',
  });
  const infrastructure = createInfrastructure(config);
  const auth = createAuth(config, infrastructure.database);
  assert.equal(auth.options.session?.cookieCache?.enabled, false);
  assert.deepEqual(auth.options.trustedOrigins, [config.webOrigin]);
  const app = await buildApp({ config, probes: infrastructure.probes, auth });
  try {
    const anonymous = await app.inject({ method: 'GET', url: '/api/auth/get-session' });
    assert.equal(anonymous.statusCode, 200);
    assert.equal(anonymous.body, 'null');

    const rejected = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: {
        origin: 'https://attacker.invalid',
        'content-type': 'application/json',
      },
      payload: {
        provider: 'github',
        callbackURL: 'https://attacker.invalid/steal-session',
        disableRedirect: true,
      },
    });
    assert.equal(rejected.statusCode, 403);

    const signIn = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: {
        origin: config.webOrigin,
        'content-type': 'application/json',
      },
      payload: {
        provider: 'github',
        callbackURL: `${config.webOrigin}/learning`,
        disableRedirect: true,
      },
    });
    assert.equal(signIn.statusCode, 200);
    assert.match(signIn.json().url, /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    const cookies = String(signIn.headers['set-cookie']);
    assert.match(cookies, /HttpOnly/);
    assert.match(cookies, /SameSite=Lax/);
    assert.match(cookies, /Secure/);

    const pool = createDatabasePool(testDatabaseUrl);
    try {
      const [verificationRows] = await pool.query<CountRow[]>(
        'select count(*) as count from verifications',
      );
      assert.ok(Number(verificationRows[0]?.count) >= 1);
    } finally {
      await pool.end();
    }
  } finally {
    await app.close();
    await infrastructure.close();
  }
});
