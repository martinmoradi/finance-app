import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { nextJsConfig } from '@repo/eslint-config/next-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Combine the compat config with your custom nextJsConfig
const eslintConfig = [
  ...nextJsConfig,
  // Ensure test files overrides come last to take precedence
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/__tests__/**/*',
      '**/__mocks__/**/*',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;
