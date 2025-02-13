import { DatabaseModule } from '@/database/database.module';
import { LoggerService } from '@/logger/logger.service';
import { SessionRepository } from '@/session/session.repository';
import { SessionService } from '@/session/session.service';
import { Module } from '@nestjs/common';

/**
 * Module for managing user sessions.
 * Provides services and repositories for session management.
 */
@Module({
  imports: [DatabaseModule],
  providers: [SessionService, SessionRepository, LoggerService],
  exports: [SessionService],
})
export class SessionModule {}
