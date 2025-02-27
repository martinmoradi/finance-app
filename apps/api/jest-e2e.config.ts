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
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'html'],
};
