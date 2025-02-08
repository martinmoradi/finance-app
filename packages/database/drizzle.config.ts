import type { Config } from 'drizzle-kit';
import { getRequiredEnvVar } from '@repo/env-validation';

export default {
  schema: './src/schema',
  out: './src/migrations/',
  dialect: 'postgresql',
  dbCredentials: {
    url: getRequiredEnvVar('DATABASE_URL'),
  },
  verbose: true,
  strict: true,
} satisfies Config;
