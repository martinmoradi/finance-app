// Set test environment flag
process.env.TEST = 'true';

// Set database URL based on environment
if (!process.env.CI) {
  // Local development: use test database
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/finance_app_test';
}
// In CI: DATABASE_URL will already be set by the CI environment
