module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['<rootDir>/src/e2e/helpers/setup.ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/schema/**/*.(t|j)s',
    '!**/**/index.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/e2e/**',
    '!e2e/**',
    '!**/**/__tests__/**/*.helper.ts',
    '!src/**/__tests__/**/*.helper.ts',
    '!**/**/tests/**/*.helper.ts',
    '!**/**/*.fixtures.ts',
    '!**/**/*.fixture.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'html'],
};
