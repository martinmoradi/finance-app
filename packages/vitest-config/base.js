import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export const baseConfig = defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    environment: 'node',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'turbo/**'],
    passWithNoTests: true,
  },
});
