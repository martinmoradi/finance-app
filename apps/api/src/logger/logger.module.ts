import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Module for providing the LoggerService.
 */
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
