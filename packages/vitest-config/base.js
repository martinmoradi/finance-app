import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export const baseConfig = defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
  },
});
