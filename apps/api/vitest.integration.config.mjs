import config from '@repo/vitest-config/nest';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  config,
  defineConfig({
    test: {
      ...config.test,
      globals: true,
      environment: 'node',
      include: ['src/**/integration/**/*.integration.test.{js,jsx,ts,tsx}'],
    },
  }),
);
