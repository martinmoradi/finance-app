import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseConfig } from './base.js';

export default defineConfig({
  ...baseConfig,
  test: {
    environment: 'jsdom',
  },
  plugins: [...(baseConfig.plugins || []), react()],
});
