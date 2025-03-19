const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock problematic ES modules directly
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    // Use next/jest's default transformer for js, jsx, ts, tsx files
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // Very permissive transformIgnorePatterns to handle ES modules in PNPM
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/uncrypto@|.pnpm/iron-session@))',
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!app/layout.{js,jsx,ts,tsx}',
    '!app/providers.{js,jsx,ts,tsx}',
    '!lib/registry.{js,jsx,ts,tsx}',
    '!pages/_app.{js,jsx,ts,tsx}',
    '!pages/_document.{js,jsx,ts,tsx}',
    '!app/error.{js,jsx,ts,tsx}',
    '!**/types/**',
    '!**/constants/**',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/*.config.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
    '!**/*.test.{js,jsx,ts,tsx}',
    '!**/*.spec.{js,jsx,ts,tsx}',
    '!**/test-utils/**',
    '!jest.config.js',
    '!jest.setup.js',
    '!next.config.js',
    '!next.config.mjs',
    '!next.config.ts',
    '!postcss.config.js',
    '!tailwind.config.js',
    '!tailwind.config.ts',
    '!jest.config.ts',
    '!jest.setup.ts',
    '!eslint.config.mjs',
    '**/!middleware.ts',
    '**/!instrumentation.ts',
    '!sentry.client.config.ts',
    '!sentry.server.config.ts',
    '!sentry.utils.ts',
    '!sentry.browser.config.ts',
    '!sentry.node.config.ts',
    '!**/components/ui/**',
    '!**/global-error.tsx',
    '!**/fonts.ts',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
