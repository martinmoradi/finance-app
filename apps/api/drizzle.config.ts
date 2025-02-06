import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: 'database/schema/schema.ts',
  out: 'database/migrations',
  strict: true,
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
