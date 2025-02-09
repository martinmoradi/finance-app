// Import required dependencies
import { createDatabaseClient, type DatabaseConnection } from '@/client';
import { schema } from '@/schema';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { getRequiredEnvVar } from '@repo/env-validation';
/**
 * Sets up a test database connection
 * @returns DatabaseConnection object containing db client and connection pool
 */
export async function setupTestDatabase(): Promise<DatabaseConnection> {
  const connectionString = process.env.CI
    ? getRequiredEnvVar('DATABASE_URL')
    : 'postgresql://postgres:postgres@localhost:5433/finance_app_test';

  const connection = await createDatabaseClient({
    connectionString,
  });

  return connection;
}

/**
 * Starts a new database transaction
 * @param pool - PostgreSQL connection pool
 */
export async function startTransaction(pool: Pool) {
  await pool.query('BEGIN');
}

/**
 * Rolls back the current database transaction
 * @param pool - PostgreSQL connection pool
 */
export async function rollbackTransaction(pool: Pool) {
  await pool.query('ROLLBACK');
}

/**
 * Cleans up the test database by truncating all tables
 * @param connection - Database connection object
 */
export async function cleanupTestDatabase(connection: DatabaseConnection) {
  const { db } = connection;

  // Iterate through schema and truncate each table
  for (const [tableName] of Object.entries(schema)) {
    await db.execute(sql`TRUNCATE TABLE ${sql.identifier(tableName)} CASCADE`);
  }
}
