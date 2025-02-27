const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases (if you're using these in your project)
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    // Use next/jest's default transformer for ts and tsx files
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
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
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
