import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/logger/logger.service';
import { DatabaseConnection, DatabaseClient, pg } from '@repo/database';

@Injectable()
export class TestDatabaseService {
  constructor(private readonly logger: LoggerService) {}
  private connection: DatabaseConnection | null = null;

  setConnection(connection: DatabaseConnection): void {
    this.connection = connection;
  }

  get db(): DatabaseClient {
    if (!this.connection) {
      this.logger.fatal('Database connection not initialized');
      throw new Error('Database connection not initialized');
    }
    return this.connection.db;
  }

  get pool(): pg.Pool {
    if (!this.connection) {
      this.logger.fatal('Database connection not initialized');
      throw new Error('Database connection not initialized');
    }
    return this.connection.pool;
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.pool.end();
  }
}
