import { LoggerService } from '@/logger/logger.service';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { DatabaseClient, DatabaseConnection } from '@repo/database';
import { createDatabaseClient } from '@repo/database';
import { getRequiredEnvVar } from '@repo/env-validation';

/**
 * Service responsible for managing database connections and providing database access
 * throughout the application lifecycle.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Database connection instance. Null before initialization.
   */
  private connection: DatabaseConnection | null = null;

  /**
   * Protected getter that provides access to the database client.
   * @throws Error if database connection is not initialized
   * @returns DatabaseClient instance
   */
  protected get db(): DatabaseClient {
    if (!this.connection) {
      this.logger.fatal('Database connection not initialized');
      throw new Error('Database connection not initialized');
    }
    return this.connection.db;
  }

  /**
   * Lifecycle hook that initializes the database connection when the module starts.
   * Configures connection pool with specified parameters.
   */
  async onModuleInit(): Promise<void> {
    const databaseUrl = getRequiredEnvVar('DATABASE_URL');
    this.connection = await createDatabaseClient({
      connectionString: databaseUrl,
      maxConnections: 5, // Maximum number of clients the pool should contain
      connectionTimeoutMillis: 10000, // Maximum time to wait for a connection from the pool
    });
  }

  /**
   * Lifecycle hook that gracefully closes the database connection when the module is destroyed.
   * Ensures all connections in the pool are properly terminated.
   */
  async onModuleDestroy(): Promise<void> {
    await this.connection?.pool.end();
    if (!process.env.TEST) {
      console.log('Database connection closed');
    }
  }
}
