import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'mysql://invalid:invalid@127.0.0.1:3306/invalid',
  },
  strict: true,
  verbose: true,
});
