import { defineConfig } from 'vitest/config';
import { baseConfig } from './base.js';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  ...baseConfig,
  plugins: [...(baseConfig.plugins || []), tsconfigPaths()],
  test: {
    ...baseConfig.test,
    environment: 'node',
    globals: true,
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.module.ts',
        'src/main.ts',
      ],
    },
  },
});
