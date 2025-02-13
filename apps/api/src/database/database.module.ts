import { LoggerService } from '@/logger/logger.service';
import { Module } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

/**
 * Module for managing database operations.
 * Provides a single instance of the DatabaseService.
 */
@Module({
  providers: [DatabaseService, LoggerService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
