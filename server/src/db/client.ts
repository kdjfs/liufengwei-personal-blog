import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { authSchema, productSchema } from './schema.ts';

export function createDatabasePool(databaseUrl: string): Pool {
  return createPool(databaseUrl);
}

export function createDatabase(pool: Pool) {
  return drizzle({
    client: pool,
    mode: 'default',
    schema: { ...authSchema, ...productSchema },
  });
}

export type Database = ReturnType<typeof createDatabase>;
