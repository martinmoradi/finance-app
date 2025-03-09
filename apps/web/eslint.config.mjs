import { nextJsConfig } from '@repo/eslint-config/next-js';

// Combine the compat config with your custom nextJsConfig
const eslintConfig = [
  ...nextJsConfig,

  // Add an override for the JS config files
  {
    files: ['jest.config.js', 'jest.setup.ts'],
    languageOptions: {
      parser: { ecmaVersion: 2020 },
      parserOptions: {
        project: null, // Disable TypeScript parsing for these files
        ecmaVersion: 2020,
      },
      globals: {
        jest: 'readonly',
        process: 'readonly',
        module: 'writable',
      },
    },
    // Disable TypeScript-specific rules
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Handle ESM config files separately
  {
    files: ['eslint.config.mjs'],
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        project: null, // Disable TypeScript parsing for this file
        ecmaVersion: 2022,
      },
    },
    // Disable TypeScript-specific rules
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-types': 'off',
    },
  },

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
