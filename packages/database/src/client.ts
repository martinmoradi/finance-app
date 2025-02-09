import { getRequiredEnvVar } from '@repo/env-validation';
import 'dotenv/config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema';
import type { Schema } from './schema/';

/**
 * Type alias representing a Drizzle ORM database client instance configured with our schema.
 * This type provides type-safe database operations through the Drizzle ORM layer.
 */
export type DatabaseClient = NodePgDatabase<Schema>;

/**
 * Represents a complete database connection with both the ORM client and underlying connection pool.
 * This interface combines the high-level database client for ORM operations with
 * the low-level connection pool for direct database access when needed.
 */
export interface DatabaseConnection {
  /** The Drizzle ORM database client instance configured with our schema */
  db: DatabaseClient;
  /** The underlying PostgreSQL connection pool for managing database connections */
  pool: Pool;
}

/**
 * Configuration options for database connection and pool settings.
 */
export interface DatabaseConfig {
  /** PostgreSQL connection URL */
  connectionString: string;
  /** Maximum number of clients in the connection pool */
  maxConnections?: number;
  /** Timeout for establishing new connections */
  connectionTimeoutMillis?: number;
  /** Time a client can remain idle before being closed */
  idleTimeoutMillis?: number;
  /** Number of connection retry attempts before failing */
  maxRetries?: number;
}

/**
 * Creates and initializes a database client with connection retry logic.
 *
 * This function attempts to establish a connection to the database using the provided
 * configuration. If the connection fails, it will retry with exponential backoff up
 * to the specified number of times.
 */
export async function createDatabaseClient(
  config: DatabaseConfig,
): Promise<DatabaseConnection> {
  const retries = config.maxRetries || 3;
  let lastError: Error;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Initialize connection pool with provided configuration
      const pool = new Pool({
        connectionString: process.env.CI
          ? getRequiredEnvVar('DATABASE_URL')
          : config.connectionString,
        ssl: getRequiredEnvVar('NODE_ENV') === 'production', // Enable SSL in production
        max: config.maxConnections || 5,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        allowExitOnIdle: true, // Allow the pool to cleanup idle clients
      });

      // Verify connection is working with a simple query
      await pool.query('SELECT 1');
      console.log('Database connection established');

      // Initialize Drizzle ORM with our schema
      const db = drizzle(pool, { schema });

      return { db, pool } as DatabaseConnection;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Database connection attempt ${attempt + 1}/${retries} failed:`,
        error,
      );

      if (attempt === retries - 1) {
        console.error('All connection attempts failed');
        throw lastError;
      }

      // Implement exponential backoff with a maximum delay of 10 seconds
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)),
      );
    }
  }

  throw lastError!; // Satisfy TypeScript, though this line is unreachable
}
