// @ts-check
import { nestConfig } from '@repo/eslint-config/nest';

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nestConfig,
  {
    // Add any API-specific rules here
    rules: {},
  },
];

export default config;
