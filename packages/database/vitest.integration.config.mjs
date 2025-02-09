import config from '@repo/vitest-config/internal';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...config,
  test: {
    ...config.test,
    globals: true,
    environment: 'node',
    include: ['src/**/integration/**/*.integration.test.{js,jsx,ts,tsx}'],
  },
});
