import config from '@repo/vitest-config/nest';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  config,
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts', 'test/integration/**/*.test.ts'],
      exclude: ['src/**/integration/**/*.integration.test.{js,jsx,ts,tsx}'],
    },
  }),
);
