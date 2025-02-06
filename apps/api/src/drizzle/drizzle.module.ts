/**
 * Database Connection Module for NestJS using Drizzle ORM
 *
 * @module DrizzleModule
 * @description
 * WHAT THIS MODULE DOES:
 * - Creates and manages a single database connection pool
 * - Wraps PostgreSQL connection with Drizzle ORM
 * - Provides type-safe database access throughout the application
 *
 * HOW TO USE:
 * ```typescript
 * // In other modules, inject the database like this:
 * constructor(@Inject(DRIZZLE) private db: NodePgDatabase) {}
 * ```
 */

import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as schema from 'database/schema/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';

/** Injection token for the Drizzle database connection */
export const DRIZZLE: symbol = Symbol('DRIZZLE_CONNECTION');

/**
 * Type that extends the Drizzle database type to include access to the underlying Postgres connection pool.
 * This allows us to access both the Drizzle ORM methods and the raw connection pool when needed.
 */
type DatabaseWithClient = NodePgDatabase<typeof schema> & {
  readonly _client: Pool;
};

@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      /**
       * Factory function that creates and configures the Drizzle database connection.
       *
       * @param {ConfigService} configService - NestJS config service for accessing environment variables
       * @returns {NodePgDatabase<typeof schema>} Configured Drizzle ORM database instance
       *
       * @description
       * Creates a database connection following these steps:
       * 1. Retrieves database URL from environment variables
       * 2. Establishes a connection pool with SSL enabled
       * 3. Initializes Drizzle ORM with our schema
       *
       * @example
       * // The resulting database can be injected and used like this:
       * constructor(@Inject(DRIZZLE) private db: NodePgDatabase) {
       *   // Now you can use this.db.query(...) etc.
       * }
       */
      useFactory: async (
        configService: ConfigService,
      ): Promise<NodePgDatabase<typeof schema>> => {
        // Retrieve connection string from environment
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is not defined');
        }
        // Initialize connection pool with SSL
        const pool = new Pool({
          connectionString: databaseUrl,
          ssl: configService.get('NODE_ENV') === 'production', // SSL is required for secure cloud database connections
          max: 5,
        });

        try {
          await pool.query('SELECT 1');
          console.log('Database connection established');
        } catch (error) {
          console.error('Failed to connect to database:', error);
          throw error;
        }

        // Create and return Drizzle instance with our schema
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnApplicationShutdown {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // Cleanup on application shutdown
  async onApplicationShutdown(): Promise<void> {
    const pool = (this.db as DatabaseWithClient)._client;
    await pool.end();
    console.log('Database connection closed');
  }
}
