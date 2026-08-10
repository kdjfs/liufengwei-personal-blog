import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createDatabase, createDatabasePool } from './client.ts';

const defaultMigrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

function validateDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error('DATABASE_URL is required');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid MySQL URL');
  }
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL must be a valid MySQL URL');
  return value;
}

export async function migrateDatabase(
  databaseUrl: string,
  migrationsFolder = defaultMigrationsFolder,
): Promise<void> {
  const pool = createDatabasePool(databaseUrl);
  try {
    await migrate(createDatabase(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (entrypoint === import.meta.url) {
  await migrateDatabase(validateDatabaseUrl(process.env.DATABASE_URL));
}
