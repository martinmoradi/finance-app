import { config as baseConfig } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    // Add any API-specific rules here
    rules: {},
  },
];

export default config;
