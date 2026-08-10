import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import { createClient } from 'redis';
import { createAiCoordinator } from '../../src/ai/coordinator.ts';
import { ConversationAccessError, createAiRepository } from '../../src/ai/repository.ts';
import { createDatabase, createDatabasePool } from '../../src/db/client.ts';
import { migrateDatabase } from '../../src/db/migrate.ts';

const databaseUrl = process.env.LFW_TEST_DATABASE_URL;
const redisUrl = process.env.LFW_TEST_REDIS_URL;

interface CountRow extends RowDataPacket {
  count: number;
}

function requireTestUrl(value: string | undefined, name: string): string {
  assert.ok(value, `${name} is required`);
  const url = new URL(value);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  return value;
}

// biome-ignore format: Prettier keeps node:test option blocks readable.
test(
  'real Redis atomically enforces AI rate and concurrency limits',
  {
    skip: redisUrl ? false : 'LFW_TEST_REDIS_URL is not configured',
  },
  async () => {
    const client = createClient({ url: requireTestUrl(redisUrl, 'LFW_TEST_REDIS_URL') });
    client.on('error', () => undefined);
    await client.connect();
    const identifier = randomUUID();
    const keys = [
      `lfw:{ai}:rate:${identifier}`,
      `lfw:{ai}:lease:user:${identifier}`,
      'lfw:{ai}:lease:global',
    ];
    const coordinator = createAiCoordinator(client, {
      rateLimit: 2,
      rateWindowMs: 5_000,
      userConcurrency: 1,
      globalConcurrency: 1,
      leaseTtlMs: 5_000,
    });
    try {
      assert.equal((await coordinator.checkRateLimit(identifier)).allowed, true);
      assert.equal((await coordinator.checkRateLimit(identifier)).allowed, true);
      assert.equal((await coordinator.checkRateLimit(identifier)).allowed, false);

      const first = await coordinator.acquireLease(identifier);
      assert.ok(first);
      assert.equal(await coordinator.acquireLease(identifier), null);
      await first.release();
      const afterRelease = await coordinator.acquireLease(identifier);
      assert.ok(afterRelease);
      await afterRelease.release();
    } finally {
      await client.del(keys);
      await client.quit();
    }
  },
);

// biome-ignore format: Prettier keeps node:test option blocks readable.
test(
  'AI repository bounds private context and isolates durable conversations by user',
  {
    skip: databaseUrl ? false : 'LFW_TEST_DATABASE_URL is not configured',
  },
  async () => {
    const url = requireTestUrl(databaseUrl, 'LFW_TEST_DATABASE_URL');
    assert.match(new URL(url).pathname.slice(1), /_test$/);
    await migrateDatabase(url);
    const pool = createDatabasePool(url);
    const repository = createAiRepository(createDatabase(pool));
    const userA = randomUUID();
    const userB = randomUUID();
    const annotationId = randomUUID();
    const now = new Date('2026-08-05T10:00:00.000Z');
    try {
      await pool.execute(
        'insert into users (id, name, email, email_verified) values (?, ?, ?, ?), (?, ?, ?, ?)',
        [
          userA,
          'AI User A',
          `${userA}@example.invalid`,
          false,
          userB,
          'AI User B',
          `${userB}@example.invalid`,
          false,
        ],
      );
      await pool.execute(
        `insert into learning_progress_devices
          (user_id, article_slug, device_id, title, category, read_seconds, listen_seconds,
           max_progress, first_read_at, last_activity_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userA, 'redis-lease', randomUUID(), 'Redis Lease', 'Backend', 90, 10, 75, now, now],
      );
      await pool.execute(
        `insert into annotations
          (annotation_id, user_id, article_slug, article_title, selected_text, quote_exact,
           quote_prefix, quote_suffix, note, color, source_created_at, source_updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          annotationId,
          userA,
          'redis-lease',
          'Redis Lease',
          'owner token',
          'owner token',
          '',
          '',
          '只释放自己的租约',
          'yellow',
          now,
          now,
        ],
      );
      await pool.execute(
        `insert into favorites (user_id, article_slug, source_updated_at)
         values (?, ?, ?)`,
        [userA, 'redis-lease', now],
      );

      const privateContext = await repository.readPrivateContext(userA, ['redis-lease']);
      assert.deepEqual(privateContext.progress[0], {
        articleSlug: 'redis-lease',
        maxProgress: 75,
        readSeconds: 90,
        listenSeconds: 10,
      });
      assert.equal(privateContext.annotations[0]?.note, '只释放自己的租约');
      assert.deepEqual(privateContext.favorites, ['redis-lease']);

      const conversationId = await repository.startExchange({
        userId: userA,
        title: '解释 owner token',
        mode: 'deep',
        userContent: '解释 owner token',
        privateLearningContext: true,
        sourceMetadata: { articleSlugs: ['redis-lease'] },
      });
      await repository.finishExchange(conversationId, 'deep', '租约释放必须核对 owner token。');
      await assert.rejects(
        repository.startExchange({
          userId: userB,
          conversationId,
          title: 'steal',
          mode: 'fast',
          userContent: 'steal',
          privateLearningContext: false,
          sourceMetadata: null,
        }),
        (error: unknown) => error instanceof ConversationAccessError,
      );

      const [messageRows] = await pool.query<CountRow[]>(
        'select count(*) as count from ai_messages where conversation_id = ?',
        [conversationId],
      );
      assert.equal(Number(messageRows[0]?.count), 2);
    } finally {
      await pool.execute('delete from users where id in (?, ?)', [userA, userB]);
      await pool.end();
    }
  },
);
