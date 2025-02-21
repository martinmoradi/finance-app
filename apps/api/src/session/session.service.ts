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
 * Manages session lifecycle including creation, validation, and cleanup
 */
@Injectable()
export class SessionService {
  private readonly MAX_SESSIONS_PER_USER = 5;
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly logger: LoggerService,
  ) {}

  /* -------------- Core Session Lifecycle Methods -------------- */

  /**
   * Creates new session with refresh token
   * @throws {SessionCreationFailedException} If session creation fails
   * @throws {SessionLimitExceededException} If user exceeds max sessions
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
      const sessions = await this.findAllByUserId(userId);

      await this.cleanUpExistingSession(sessions, deviceId);

      const hashedToken = await hash(refreshToken);
      const newSession = await this.createSession({
        userId,
        deviceId,
        token: hashedToken,
        expiresAt,
      });

      sessions.push(newSession);
      if (sessions.length > this.MAX_SESSIONS_PER_USER) {
        try {
          await this.enforceSessionLimit(sessions);
        } catch (error) {
          this.logger.error('Error enforcing session limit', error, {
            userId,
          });
        }
      }

      this.logger.info('Session created successfully', { userId, deviceId });
      return newSession;
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
   * Validates session and refresh token
   * @throws {SessionValidationException} If validation fails
   * @throws {SessionExpiredException} If session is expired
   * @throws {InvalidRefreshTokenException} If token doesn't match
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
   * Verifies session exists and is not expired
   * @throws {SessionNotFoundException} If session doesn't exist
   * @throws {SessionExpiredException} If session is expired
   */
  async findAndVerifySession(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession> {
    try {
      const session = await this.findSessionOrThrow(userId, deviceId);
      if (session.expiresAt < new Date()) {
        throw new SessionExpiredException();
      }
      return session;
    } catch (error) {
      if (
        error instanceof SessionNotFoundException ||
        error instanceof SessionExpiredException
      ) {
        throw error;
      }
      this.logger.error('Error during session validation', error);
      throw new SessionValidationException(error as Error);
    }
  }

  /**
   * Verifies session exists and is not expired
   * @throws {SessionNotFoundException} If session doesn't exist
   * @throws {SessionExpiredException} If session is expired
   */
  async verifySession(userId: string, deviceId: string): Promise<void> {
    await this.findAndVerifySession(userId, deviceId);
  }

  /* -------------- Session Management & Cleanup -------------- */

  /**
   * Removes all sessions for a user
   * @throws {SessionRepositoryException} If cleanup fails
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

  /** Scheduled daily cleanup of expired sessions */
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

  /* -------------- Session Limit Enforcement -------------- */

  /** Enforces maximum sessions per user by removing oldest */
  private async enforceSessionLimit(
    sessions: DatabaseSession[],
  ): Promise<void> {
    this.logger.debug('Enforcing session limit...', {
      userId: sessions[0]!.userId,
      maxSessions: this.MAX_SESSIONS_PER_USER,
    });
    try {
      while (sessions.length > this.MAX_SESSIONS_PER_USER) {
        const oldest = sessions.reduce((a, b) =>
          a.lastUsedAt <= b.lastUsedAt ? a : b,
        );
        await this.deleteSession(oldest.userId, oldest.deviceId);
        sessions.splice(sessions.indexOf(oldest), 1);
        this.logger.info('Removed oldest session due to limit', {
          userId: oldest.userId,
          deviceId: oldest.deviceId,
        });
      }
    } catch (error) {
      if (error instanceof SessionRepositoryException) {
        throw new SessionLimitExceededException(sessions[0]!.userId);
      }
      this.logger.error('Error enforcing session limit', error, {
        userId: sessions[0]!.userId,
      });
      throw new SessionLimitExceededException(sessions[0]!.userId);
    }
  }

  /* -------------- Database Operations -------------- */

  /** Creates session record in repository */
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

  /** Retrieves session or throws if not found */
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

  /** Updates last used timestamp */
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

  /**
   * Retrieves all sessions for a user with error handling.
   */
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

  /**
   * Deletes a specific session with error handling.
   */
  async deleteSession(
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

  /**
   * Utility method to remove existing session if present.
   * Used during session creation to ensure clean state.
   */
  private async cleanUpExistingSession(
    userSessions: DatabaseSession[],
    deviceId: string,
  ): Promise<void> {
    const existingSession = userSessions.find(
      (session) => session.deviceId === deviceId,
    );
    if (existingSession) {
      this.logger.info('Existing session found, deleting...', {
        userId: existingSession.userId,
        deviceId: existingSession.deviceId,
      });
      await this.deleteSession(
        existingSession.userId,
        existingSession.deviceId,
      );
    }
  }
}
