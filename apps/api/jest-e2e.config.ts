module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
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
    'src/**/*.(t|j)s',
    '!**/**/index.ts',
    '!**/**/*.config.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!e2e/**',
    '!**/**/__tests__/**/*.helper.ts',
    '!src/**/__tests__/**/*.helper.ts',
    '!**/**/tests/**/*.helper.ts',
    '!**/**/*.fixtures.ts',
    '!**/**/*.fixture.ts',
    '!**/**/*.dto.ts',
    '!**/**/main.ts',
    '!src/database/__tests__/**',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  forceCoverageMatch: ['**/*.ts'],
};
