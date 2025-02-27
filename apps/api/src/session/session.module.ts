import { DatabaseModule } from '@/database/database.module';
import { LoggerModule } from '@/logger/logger.module';
import { SessionRepository } from '@/session/session.repository';
import { SessionService } from '@/session/session.service';
import { Module } from '@nestjs/common';

/**
 * Module for managing user sessions.
 * Provides services and repositories for session management.
 */
@Module({
  imports: [DatabaseModule, LoggerModule.forFeature('SessionService')],
  providers: [SessionService, SessionRepository],
  exports: [SessionService],
})
export class SessionModule {}
