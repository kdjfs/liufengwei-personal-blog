import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { SyncOperation } from '@lfw/contracts/sync';
import type { RowDataPacket } from 'mysql2/promise';
import { createClient } from 'redis';
import { buildApp } from '../../src/app.ts';
import { createAuth } from '../../src/auth.ts';
import { parseServerConfig } from '../../src/config.ts';
import { createDatabasePool } from '../../src/db/client.ts';
import { migrateDatabase } from '../../src/db/migrate.ts';
import { createInfrastructure } from '../../src/infrastructure.ts';
import { createSyncService } from '../../src/sync/service.ts';

const databaseUrl = process.env.LFW_TEST_DATABASE_URL;
const redisUrl = process.env.LFW_TEST_REDIS_URL;
const databaseSkip = databaseUrl ? false : 'LFW_TEST_DATABASE_URL is not configured';
const redisSkip = redisUrl ? false : 'LFW_TEST_REDIS_URL is not configured';
const infrastructureSkip = databaseUrl && redisUrl ? false : 'integration URLs are not configured';
const migrationTestName = 'initial migration is repeatable and keeps identifiers binary';
const redisTestName = 'Redis provides only ephemeral coordination primitives';
const readinessTestName = 'Fastify readiness uses real MySQL and Redis probes';
const authTestName = 'Better Auth persists GitHub OAuth state with secure cookies';
const syncTestName = 'sync is idempotent, cross-user isolated, and aggregates per-device counters';
const insertUserSql = 'insert into users (id, name, email, email_verified) values (?, ?, ?, ?)';
const insertSessionSql =
  'insert into sessions (id, user_id, token, expires_at) values (?, ?, ?, ?)';
const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

interface TableRow extends RowDataPacket {
  tableName: string;
}

interface CountRow extends RowDataPacket {
  count: number;
}

interface LegacyProgressRow extends RowDataPacket {
  title: string;
  category: string;
  firstReadAt: Date;
}

interface LegacyAnnotationRow extends RowDataPacket {
  articleTitle: string;
  selectedText: string;
  sourceCreatedAt: Date;
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

async function createInitialMigrationFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'lfw-initial-migration-'));
  await mkdir(join(folder, 'meta'));
  await copyFile(
    join(migrationsFolder, '0000_melodic_prowler.sql'),
    join(folder, '0000_melodic_prowler.sql'),
  );
  await writeFile(
    join(folder, 'meta', '_journal.json'),
    JSON.stringify({
      version: '7',
      dialect: 'mysql',
      entries: [
        {
          idx: 0,
          version: '5',
          when: 1_786_296_972_128,
          tag: '0000_melodic_prowler',
          breakpoints: true,
        },
      ],
    }),
  );
  return folder;
}

test(migrationTestName, { skip: databaseSkip }, async () => {
  const testDatabaseUrl = requireTestUrl(databaseUrl, 'LFW_TEST_DATABASE_URL');
  assertSafeTestDatabase(testDatabaseUrl);
  const initialMigrationFolder = await createInitialMigrationFolder();
  const legacyUserId = randomUUID();
  const legacyAnnotationId = randomUUID();
  const legacyCreatedAt = new Date('2026-08-01T09:00:00.000Z');
  try {
    await migrateDatabase(testDatabaseUrl, initialMigrationFolder);
    const legacyPool = createDatabasePool(testDatabaseUrl);
    try {
      await legacyPool.execute(insertUserSql, [
        legacyUserId,
        'Legacy User',
        `${legacyUserId}@example.invalid`,
        false,
      ]);
      await legacyPool.execute(
        `insert into learning_progress_devices
          (user_id, article_slug, device_id, read_seconds, max_progress, resume_progress,
           last_activity_at, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          legacyUserId,
          'legacy-article',
          randomUUID(),
          30,
          0.5,
          0.4,
          legacyCreatedAt,
          legacyCreatedAt,
          legacyCreatedAt,
        ],
      );
      await legacyPool.execute(
        `insert into annotations
          (annotation_id, user_id, article_slug, quote_exact, quote_prefix, quote_suffix,
           note, color, source_updated_at, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          legacyAnnotationId,
          legacyUserId,
          'legacy-article',
          'legacy quote',
          '',
          '',
          'legacy note',
          'yellow',
          legacyCreatedAt,
          legacyCreatedAt,
          legacyCreatedAt,
        ],
      );
    } finally {
      await legacyPool.end();
    }
    await migrateDatabase(testDatabaseUrl);
  } finally {
    await rm(initialMigrationFolder, { recursive: true, force: true });
  }
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

    const [legacyProgressRows] = await pool.query<LegacyProgressRow[]>(
      `select title, category, first_read_at as firstReadAt
         from learning_progress_devices where user_id = ?`,
      [legacyUserId],
    );
    assert.equal(legacyProgressRows[0]?.title, 'legacy-article');
    assert.equal(legacyProgressRows[0]?.category, 'Uncategorized');
    assert.equal(legacyProgressRows[0]?.firstReadAt.toISOString(), legacyCreatedAt.toISOString());

    const [legacyAnnotationRows] = await pool.query<LegacyAnnotationRow[]>(
      `select article_title as articleTitle, selected_text as selectedText,
              source_created_at as sourceCreatedAt
         from annotations where user_id = ? and annotation_id = ?`,
      [legacyUserId, legacyAnnotationId],
    );
    assert.equal(legacyAnnotationRows[0]?.articleTitle, 'legacy-article');
    assert.equal(legacyAnnotationRows[0]?.selectedText, 'legacy quote');
    assert.equal(
      legacyAnnotationRows[0]?.sourceCreatedAt.toISOString(),
      legacyCreatedAt.toISOString(),
    );
    await pool.execute('delete from users where id = ?', [legacyUserId]);

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

test(syncTestName, { skip: databaseSkip }, async () => {
  const testDatabaseUrl = requireTestUrl(databaseUrl, 'LFW_TEST_DATABASE_URL');
  await migrateDatabase(testDatabaseUrl);
  const config = parseServerConfig({
    NODE_ENV: 'test',
    API_ORIGIN: 'http://127.0.0.1:8788',
    DATABASE_URL: testDatabaseUrl,
    REDIS_URL: 'redis://127.0.0.1:36380/0',
    WEB_ORIGIN: 'http://127.0.0.1:4321',
    SESSION_SECRET: 'integration-session-secret-at-least-32-characters',
  });
  const infrastructure = createInfrastructure(config);
  const service = createSyncService(infrastructure.database);
  const userA = randomUUID();
  const userB = randomUUID();
  const annotationId = randomUUID();
  const deviceA = randomUUID();
  const deviceB = randomUUID();
  const now = '2026-08-03T10:00:00.000Z';
  const later = '2026-08-04T10:00:00.000Z';
  await infrastructure.mysqlPool.execute(insertUserSql, [
    userA,
    'Sync User A',
    `${userA}@example.invalid`,
    false,
  ]);
  await infrastructure.mysqlPool.execute(insertUserSql, [
    userB,
    'Sync User B',
    `${userB}@example.invalid`,
    false,
  ]);

  const progressA = {
    operationId: randomUUID(),
    deviceId: deviceA,
    entityType: 'progress',
    entityId: 'mysql-index',
    operation: 'upsert',
    createdAt: now,
    payload: {
      articleSlug: 'mysql-index',
      title: 'MySQL Index',
      category: 'Backend',
      readSeconds: 100,
      listenSeconds: 20,
      maxProgress: 80,
      lastProgress: 75,
      lastHeadingId: 'covering-index',
      lastScrollY: 1200,
      firstReadAt: '2026-08-01T09:00:00.000Z',
      lastReadAt: now,
      completedAt: null,
    },
  } satisfies SyncOperation;
  const annotation = {
    operationId: randomUUID(),
    deviceId: deviceA,
    entityType: 'annotation',
    entityId: annotationId,
    operation: 'upsert',
    createdAt: now,
    payload: {
      annotationId,
      articleSlug: 'mysql-index',
      articleTitle: 'MySQL Index',
      selectedText: 'B+ Tree',
      note: "'; drop table annotations; --",
      quoteExact: 'B+ Tree',
      quotePrefix: '',
      quoteSuffix: '',
      color: 'yellow',
      createdAt: now,
      sourceUpdatedAt: now,
      baseVersion: null,
      deletedAt: null,
    },
  } satisfies SyncOperation;
  const favorite = {
    operationId: randomUUID(),
    deviceId: deviceA,
    entityType: 'favorite',
    entityId: 'mysql-index',
    operation: 'upsert',
    createdAt: now,
    payload: {
      articleSlug: 'mysql-index',
      sourceUpdatedAt: now,
      baseVersion: null,
      deletedAt: null,
    },
  } satisfies SyncOperation;

  try {
    const first = await service.sync(userA, { operations: [progressA, annotation, favorite] });
    assert.deepEqual(
      first.results.map((result) => result.status),
      ['applied', 'applied', 'applied'],
    );
    assert.equal(first.annotations[0]?.note, annotation.payload.note);

    const replay = await service.sync(userA, { operations: [progressA, annotation, favorite] });
    assert.deepEqual(
      replay.results.map((result) => result.status),
      ['duplicate', 'duplicate', 'duplicate'],
    );

    const progressB = {
      ...progressA,
      operationId: randomUUID(),
      deviceId: deviceB,
      createdAt: later,
      payload: {
        ...progressA.payload,
        readSeconds: 80,
        listenSeconds: 5,
        maxProgress: 100,
        lastProgress: 95,
        lastHeadingId: 'latest-heading',
        lastReadAt: later,
        completedAt: later,
      },
    } satisfies SyncOperation;
    const staleAnnotation = {
      ...annotation,
      operationId: randomUUID(),
      createdAt: later,
      payload: {
        ...annotation.payload,
        note: 'stale offline edit',
        sourceUpdatedAt: later,
        baseVersion: null,
      },
    } satisfies SyncOperation;
    const merged = await service.sync(userA, { operations: [progressB, staleAnnotation] });
    assert.deepEqual(
      merged.results.map((result) => result.status),
      ['applied', 'conflict'],
    );
    assert.equal(merged.progress[0]?.readSeconds, 180);
    assert.equal(merged.progress[0]?.listenSeconds, 25);
    assert.equal(merged.progress[0]?.lastHeadingId, 'latest-heading');
    assert.equal(merged.annotations[0]?.note, annotation.payload.note);

    const tombstone = {
      ...annotation,
      operationId: randomUUID(),
      operation: 'delete',
      createdAt: later,
      payload: {
        ...annotation.payload,
        sourceUpdatedAt: later,
        baseVersion: 1,
        deletedAt: later,
      },
    } satisfies SyncOperation;
    const deleted = await service.sync(userA, { operations: [tombstone] });
    assert.equal(deleted.results[0]?.status, 'applied');
    assert.equal(deleted.annotations[0]?.version, 2);
    assert.equal(deleted.annotations[0]?.deletedAt, later);

    const otherUser = await service.sync(userB, {
      operations: [{ ...annotation, operationId: randomUUID(), deviceId: deviceB }],
    });
    assert.equal(otherUser.results[0]?.status, 'applied');
    assert.equal(otherUser.annotations.length, 1);
    assert.equal(otherUser.progress.length, 0);

    const [operationRows] = await infrastructure.mysqlPool.query<CountRow[]>(
      'select count(*) as count from sync_operations where user_id = ?',
      [userA],
    );
    assert.equal(Number(operationRows[0]?.count), 6);
  } finally {
    await infrastructure.mysqlPool.execute('delete from users where id in (?, ?)', [userA, userB]);
    await infrastructure.close();
  }
});
