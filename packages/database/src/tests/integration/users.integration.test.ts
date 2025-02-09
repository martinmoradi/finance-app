import type { DatabaseConnection } from '@/client';
import { DatabaseClient } from '@/client';
import { schema } from '@/schema';
import { main as seedDatabase } from '@/seed';
import {
  cleanupTestDatabase,
  rollbackTransaction,
  setupTestDatabase,
  startTransaction,
} from '@/tests/helpers/db';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

describe('Users Integration Tests', () => {
  let connection: DatabaseConnection;
  let db: DatabaseClient;
  let pool: Pool;

  // Set up test database and seed data before all tests
  beforeAll(async () => {
    // Initialize database connection and get client/pool references
    connection = await setupTestDatabase();
    db = connection.db;
    pool = connection.pool;

    // Set test environment and seed initial data
    process.env.TEST = 'true';
    await seedDatabase();
  });

  // Start a new transaction before each test for isolation
  beforeEach(async () => {
    await startTransaction(pool);
  });

  // Roll back transaction after each test to maintain clean state
  afterEach(async () => {
    await rollbackTransaction(pool);
  });

  // Clean up database and close connections after all tests complete
  afterAll(async () => {
    await cleanupTestDatabase(connection);
    await pool.end();
  });

  it('should find seeded users', async () => {
    const result = await db.query.users.findMany();

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('email');
    expect(result[0]).toHaveProperty('name');
  });

  it('should find user by email', async () => {
    const users = await db.query.users.findMany();
    // Add null check for TypeScript
    const testUser = users[0];
    if (!testUser) {
      throw new Error('No test user found');
    }

    const result = await db.query.users.findFirst({
      where: eq(schema.users.email, testUser.email),
    });

    expect(result).toEqual(testUser);
  });
});
