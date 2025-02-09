import config from '@repo/vitest-config/internal';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...config,
  test: {
    ...config.test,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['src/**/integration/**/*.integration.test.{js,jsx,ts,tsx}'],
  },
});
