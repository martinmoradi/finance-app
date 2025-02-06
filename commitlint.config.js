module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enumeration
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only changes
        'style', // Changes that do not affect the meaning of the code
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'perf', // A code change that improves performance
        'test', // Adding missing tests or correcting existing tests
        'build', // Changes that affect the build system or external dependencies
        'ci', // Changes to our CI configuration files and scripts
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    // Scope enumeration
    'scope-enum': [
      2,
      'always',
      [
        'web', // Frontend application
        'api', // Backend API
        'shared', // Shared libraries/utilities
        'deps', // Dependencies
        'config', // Configuration changes
        'ci', // CI related
        'db', // Database related
        'auth', // Authentication related
        'docker', // Docker related
        'tooling', // Tooling related
        '*', // Any scope
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    // Type case
    'type-case': [2, 'always', 'lower-case'],
    // Subject case
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    // Subject full stop
    'subject-full-stop': [2, 'never', '.'],
    // Subject empty
    'subject-empty': [2, 'never'],
    // Type empty
    'type-empty': [2, 'never'],
    // Body max line length
    'body-max-line-length': [0, 'always'],
    // Footer max line length
    'footer-max-line-length': [0, 'always'],
  },
};
