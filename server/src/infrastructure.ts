import type { Pool } from 'mysql2/promise';
import { createClient, type RedisClientType } from 'redis';
import type { AppProbes } from './app.ts';
import type { ServerConfig } from './config.ts';
import { createDatabase, createDatabasePool, type Database } from './db/client.ts';

export interface Infrastructure {
  database: Database;
  mysqlPool: Pool;
  redis: RedisClientType;
  ensureRedisConnection: () => Promise<void>;
  probes: AppProbes;
  close: () => Promise<void>;
}

export function createInfrastructure(config: ServerConfig): Infrastructure {
  const mysqlPool = createDatabasePool(config.databaseUrl);
  const database = createDatabase(mysqlPool);
  const redis = createClient({
    url: config.redisUrl,
    socket: {
      connectTimeout: 1_000,
      reconnectStrategy: false,
    },
  });
  redis.on('error', () => undefined);

  let redisConnection: Promise<void> | undefined;
  async function ensureRedisConnection(): Promise<void> {
    if (redis.isReady) return;
    redisConnection ??= redis.connect().then(() => undefined);
    try {
      await redisConnection;
    } finally {
      redisConnection = undefined;
    }
  }

  return {
    database,
    mysqlPool,
    redis,
    ensureRedisConnection,
    probes: {
      mysql: {
        async check() {
          await mysqlPool.query('select 1');
        },
      },
      redis: {
        async check() {
          await ensureRedisConnection();
          await redis.ping();
        },
      },
    },
    async close() {
      await Promise.allSettled([mysqlPool.end(), redis.isOpen ? redis.close() : Promise.resolve()]);
    },
  };
}
