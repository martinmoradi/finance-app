import { LoggerService } from '@/logger/logger.service';
import {
  InvalidRefreshTokenException,
  SessionCleanupFailedException,
  SessionCreationFailedException,
  SessionExpiredException,
  SessionLimitExceededException,
  SessionNotFoundException,
  SessionRepositoryException,
  SessionValidationException,
} from '@/session/exceptions';
import { SessionRepository } from '@/session/session.repository';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseSession } from '@repo/types';
import { CreateSession } from '@repo/validation';
import { hash, verify } from 'argon2';

/**
 * Service responsible for managing user sessions including creation,
 * validation, and cleanup of sessions.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly logger: LoggerService,
  ) {}

  /* -------------- Public Business Methods -------------- */

  /**
   * Creates a new session with a hashed refresh token.
   */
  async createSessionWithToken(
    userId: string,
    deviceId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<DatabaseSession> {
    this.logger.debug('Creating new session with token...', {
      userId,
      deviceId,
    });
    try {
      await this.cleanUpExistingSession(userId, deviceId);
      const hashedToken = await hash(refreshToken);
      const session = await this.createSession({
        userId,
        deviceId,
        token: hashedToken,
        expiresAt,
      });

      this.logger.info('Session created successfully', { userId, deviceId });
      return session;
    } catch (error) {
      if (error instanceof SessionRepositoryException) {
        throw new SessionCreationFailedException(error);
      }
      if (error instanceof SessionCreationFailedException) {
        throw error;
      }
      this.logger.error('Unexpected error during session creation', error, {
        userId,
        deviceId,
      });
      throw new SessionCreationFailedException(error as Error);
    }
  }

  /**
   * Validates an existing session using the refresh token.
   */
  async validateSession(
    userId: string,
    deviceId: string,
    refreshToken: string,
  ): Promise<DatabaseSession> {
    this.logger.debug('Validating session...', { userId, deviceId });
    try {
      const session = await this.findSessionOrThrow(userId, deviceId);

      if (session.expiresAt < new Date()) {
        this.logger.warn('Session expired', { userId, deviceId });
        throw new SessionExpiredException();
      }

      const isRefreshTokenValid = await verify(session.token, refreshToken);
      if (!isRefreshTokenValid) {
        this.logger.warn('Invalid refresh token', { userId, deviceId });
        throw new InvalidRefreshTokenException();
      }

      const updatedSession = await this.updateLastUsedAt(userId, deviceId);

      this.logger.info('Session validated successfully', {
        userId,
        deviceId,
      });
      return updatedSession;
    } catch (error) {
      if (error instanceof SessionValidationException) {
        throw error;
      }
      if (error instanceof SessionRepositoryException) {
        throw new SessionValidationException(error);
      }
      this.logger.error('Unexpected error during session validation', error, {
        userId,
        deviceId,
      });
      throw new SessionValidationException(error as Error);
    }
  }

  /**
   * Enforces maximum number of sessions per user.
   */
  async enforceSessionLimit(
    userId: string,
    maxSessions: number = 5,
  ): Promise<void> {
    this.logger.debug('Enforcing session limit...', { userId, maxSessions });
    try {
      const sessions = await this.findAllByUserId(userId);
      if (sessions.length >= maxSessions) {
        const oldest = sessions.reduce((a, b) =>
          a.lastUsedAt < b.lastUsedAt ? a : b,
        );
        await this.deleteSession(oldest.userId, oldest.deviceId);
        this.logger.info('Removed oldest session due to limit', {
          userId,
          deviceId: oldest.deviceId,
        });
      }
    } catch (error) {
      if (error instanceof SessionRepositoryException) {
        throw new SessionLimitExceededException(userId);
      }
      this.logger.error('Error enforcing session limit', error, { userId });
      throw new SessionLimitExceededException(userId);
    }
  }

  /**
   * Removes all sessions for a specific user.
   */
  async removeAllSessionsForUser(userId: string): Promise<DatabaseSession[]> {
    this.logger.debug('Removing all sessions for user...', { userId });
    try {
      const sessions = await this.sessionRepository.deleteAllForUser(userId);
      this.logger.info('Successfully removed all sessions for user', {
        userId,
      });
      return sessions;
    } catch (error) {
      this.logger.error('Failed to remove all sessions for user', error, {
        userId,
      });
      throw new SessionRepositoryException(
        'delete all',
        userId,
        undefined,
        error as Error,
      );
    }
  }

  /**
   * Automatically removes expired sessions at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpired(): Promise<void> {
    this.logger.debug('Running expired sessions cleanup...');
    try {
      await this.sessionRepository.deleteExpired();
      this.logger.info('Expired sessions cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', error);
      throw new SessionCleanupFailedException(error as Error);
    }
  }

  /* -------------- Private Repository Methods -------------- */

  private async createSession(
    newSession: CreateSession,
  ): Promise<DatabaseSession> {
    try {
      const session = await this.sessionRepository.create(newSession);
      if (!session) {
        this.logger.warn('Database operation succeeded but returned null', {
          userId: newSession.userId,
          deviceId: newSession.deviceId,
        });
        throw new SessionRepositoryException(
          'create',
          newSession.userId,
          newSession.deviceId,
        );
      }
      return session;
    } catch (error) {
      this.logger.error('Database error during session creation', error, {
        userId: newSession.userId,
        deviceId: newSession.deviceId,
      });
      throw new SessionRepositoryException(
        'create',
        newSession.userId,
        newSession.deviceId,
        error as Error,
      );
    }
  }

  private async findSessionOrNull(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    try {
      return await this.sessionRepository.findOne(userId, deviceId);
    } catch (error) {
      this.logger.error('Database error during session find', error, {
        userId,
        deviceId,
      });
      throw new SessionRepositoryException(
        'find',
        userId,
        deviceId,
        error as Error,
      );
    }
  }

  private async findSessionOrThrow(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession> {
    try {
      const session = await this.sessionRepository.findOne(userId, deviceId);
      if (!session) {
        this.logger.error('Session not found', { userId, deviceId });
        throw new SessionNotFoundException();
      }
      return session;
    } catch (error) {
      if (error instanceof SessionNotFoundException) {
        throw error;
      }
      this.logger.error('Database error during session find', error, {
        userId,
        deviceId,
      });
      throw new SessionRepositoryException(
        'find',
        userId,
        deviceId,
        error as Error,
      );
    }
  }

  private async updateLastUsedAt(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession> {
    try {
      const session = await this.sessionRepository.updateLastUsedAt(
        userId,
        deviceId,
      );
      if (!session) {
        this.logger.error('Database operation succeeded but returned null', {
          userId,
          deviceId,
        });
        throw new SessionRepositoryException('update', userId, deviceId);
      }
      return session;
    } catch (error) {
      this.logger.error('Database error during session update', error, {
        userId,
        deviceId,
      });
      throw new SessionRepositoryException(
        'update',
        userId,
        deviceId,
        error as Error,
      );
    }
  }

  private async findAllByUserId(userId: string): Promise<DatabaseSession[]> {
    try {
      return await this.sessionRepository.findAllByUserId(userId);
    } catch (error) {
      this.logger.error('Database error during session find all', error, {
        userId,
      });
      throw new SessionRepositoryException(
        'find all',
        userId,
        undefined,
        error as Error,
      );
    }
  }

  private async deleteSession(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    try {
      return await this.sessionRepository.delete(userId, deviceId);
    } catch (error) {
      this.logger.error('Database error during session delete', error, {
        userId,
        deviceId,
      });
      throw new SessionRepositoryException(
        'delete',
        userId,
        deviceId,
        error as Error,
      );
    }
  }

  private async cleanUpExistingSession(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    const existingSession = await this.findSessionOrNull(userId, deviceId);
    if (existingSession) {
      await this.deleteSession(userId, deviceId);
    }
  }
}
