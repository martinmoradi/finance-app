import { getRequiredEnvVar } from '@repo/env-validation';
import type { Config } from 'drizzle-kit';

// Use test database URL if TEST is set in environment
const dbUrl = getRequiredEnvVar('DATABASE_URL');

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
