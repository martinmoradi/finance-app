import { getRequiredEnvVar } from '@repo/env-validation';
import type { Config } from 'drizzle-kit';

console.log('Process env in drizzle config:', {
  DATABASE_URL: process.env.DATABASE_URL,
  CI: process.env.CI,
  NODE_ENV: process.env.NODE_ENV,
});

const dbUrl = getRequiredEnvVar('DATABASE_URL');

console.log('Database URL resolved to:', dbUrl);

export default {
  schema: './src/schema',
  out: './src/migrations/',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
} satisfies Config;
