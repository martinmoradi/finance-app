import { LoggerModule } from '@/logger/logger.module';
import { Module } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

/**
 * Module for managing database operations.
 * Provides a single instance of the DatabaseService.
 */
@Module({
  imports: [LoggerModule.forFeature('DatabaseService')],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
