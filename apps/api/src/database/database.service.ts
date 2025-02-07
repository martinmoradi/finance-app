// database.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { DatabaseClient, DatabaseConnection } from '@repo/database';
import { createDatabaseClient } from '@repo/database';
import { getRequiredEnvVar } from '@repo/env-validation';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: DatabaseConnection | null = null;

  protected get db(): DatabaseClient {
    if (!this.connection) {
      throw new Error('Database connection not initialized');
    }
    return this.connection.db;
  }

  async onModuleInit(): Promise<void> {
    const databaseUrl = getRequiredEnvVar('DATABASE_URL');
    this.connection = await createDatabaseClient({
      connectionString: databaseUrl,
      maxConnections: 5,
      connectionTimeoutMillis: 10000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.pool.end();
    console.log('Database connection closed');
  }
}
