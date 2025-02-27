import { LoggerService } from '@/logger/logger.service';
import { CreateSessionWithTokenDto } from '@/session/dto/create-session-with-token.dto';
import { SelectSessionDto } from '@/session/dto/select-session.dto';
import { RefreshSessionWithTokenDto } from '@/session/dto/refresh-session-with-token.dto';
import { ValidateSessionWithTokenDto } from '@/session/dto/validate-session-with-token.dto';
import {
  EnforceSessionLimitException,
  InvalidRefreshTokenException,
  SessionCleanupFailedException,
  SessionCreationFailedException,
  SessionExpiredException,
  SessionLimitExceededException,
  SessionNotFoundException,
  SessionRefreshFailedException,
  SessionRepositoryException,
  SessionRepositoryOperation,
  SessionValidationException,
} from '@/session/exceptions';
import { SessionRepository } from '@/session/session.repository';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseSession, SessionUpdate } from '@repo/types';
import { hash, verify } from 'argon2';

/**
 * Manages user session lifecycle and validation.
 *
 * All methods log unexpected errors and wrap known errors in appropriate exceptions.
 * Database operations are wrapped in SessionRepositoryException.
 */
@Injectable()
export class SessionService {
  private readonly MAX_SESSIONS_PER_USER = 5;
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly logger: LoggerService,
  ) {}

  /* -------------- Public API Methods -------------- */

  /**
   * Creates new session with refresh token.
   * @throws {SessionCreationFailedException}
   */
  async createSessionWithToken({
    userId,
    deviceId,
    token,
    tokenId,
    expiresAt,
  }: CreateSessionWithTokenDto): Promise<DatabaseSession> {
    this.logger.debug('Starting session creation with token', {
      userId,
      deviceId,
      action: 'createSessionWithToken',
    });
    try {
      // 1. Find all sessions for user
      const sessions = await this.findAllByUserId(userId);

      // 2. Clean up existing session
      if (sessions.length > 0) {
        await this.cleanUpExistingSession(sessions, deviceId);
      }

      // 3. Hash refresh token
      const hashedToken = await hash(token);

      // 4. Create new session
      const newSession = await this.createSession({
        userId,
        deviceId,
        token: hashedToken,
        tokenId,
        expiresAt,
      });

      // 5. Enforce session limit
      sessions.push(newSession);
      if (sessions.length > this.MAX_SESSIONS_PER_USER) {
        await this.enforceSessionLimit(sessions);
      }

      // 6. Log success and return session
      this.logger.info('Session created successfully', {
        userId,
        deviceId,
      });
      return newSession;
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof SessionRepositoryException ||
        error instanceof SessionLimitExceededException
      ) {
        throw new SessionCreationFailedException(error);
      }
      if (error instanceof SessionCreationFailedException) {
        throw error;
      }
      this.logger.error('Unexpected error during session creation', error, {
        userId,
        deviceId,
        action: 'createSessionWithToken',
      });
      throw new SessionCreationFailedException(error as Error);
    }
  }

  /**
   * Validates session and refresh token.
   * @throws {SessionValidationException}
   */
  async validateSessionWithToken({
    userId,
    deviceId,
    refreshToken,
  }: ValidateSessionWithTokenDto): Promise<DatabaseSession> {
    this.logger.debug('Starting session validation with token', {
      userId,
      deviceId,
      action: 'validateSessionWithToken',
    });
    try {
      // 1. Find session
      const session = await this.findSessionOrThrow({ userId, deviceId });

      // 2. Check if session has expired based on timestamp
      this.validateSessionExpiration(session);

      // 3. Verify the provided refresh token matches what's stored
      const isRefreshTokenValid = await verify(session.token, refreshToken);
      if (!isRefreshTokenValid) {
        this.logger.warn('Invalid refresh token', {
          userId,
          deviceId,
          action: 'validateSessionWithToken',
        });
        throw new InvalidRefreshTokenException();
      }

      // 4. Log success and return session
      this.logger.info('Session validated successfully', {
        userId,
        deviceId,
        action: 'validateSessionWithToken',
      });
      return session;
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof SessionRepositoryException ||
        error instanceof SessionNotFoundException ||
        error instanceof SessionExpiredException ||
        error instanceof InvalidRefreshTokenException
      ) {
        throw new SessionValidationException(error);
      }
      if (error instanceof SessionValidationException) {
        throw error;
      }
      this.logger.error('Unexpected error during session validation', error, {
        userId,
        deviceId,
        action: 'validateSessionWithToken',
      });
      throw new SessionValidationException(error as Error);
    }
  }

  /**
   * Updates session with new token and refreshes last used timestamp.
   *
   * Logs unexpected errors.
   *
   * @throws {SessionRefreshFailedException}
   */
  async refreshSessionWithToken({
    userId,
    deviceId,
    token,
    tokenId,
  }: RefreshSessionWithTokenDto): Promise<DatabaseSession> {
    this.logger.debug('Starting session refresh with token', {
      userId,
      deviceId,
      action: 'refreshSessionWithToken',
    });
    try {
      // 1. Find session
      const session = await this.findSessionOrThrow({ userId, deviceId });

      // 2. Update session
      const updatedSession = await this.updateSession({
        ...session,
        lastUsedAt: new Date(),
        token,
        tokenId,
      });

      // 3. Log success and return session
      this.logger.info('Session refreshed successfully', {
        userId,
        deviceId,
        action: 'refreshSessionWithToken',
      });
      return updatedSession;
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof SessionRepositoryException ||
        error instanceof SessionValidationException
      ) {
        throw new SessionRefreshFailedException(error);
      }
      if (error instanceof SessionRefreshFailedException) {
        throw error;
      }
      this.logger.error('Unexpected error during session refresh', error, {
        userId,
        deviceId,
        action: 'refreshSessionWithToken',
      });
      throw new SessionRefreshFailedException(error as Error);
    }
  }

  /**
   * Returns session if it exists and is valid.
   * @throws {SessionValidationException}
   */
  async getValidSession({
    userId,
    deviceId,
  }: SelectSessionDto): Promise<DatabaseSession> {
    this.logger.debug('Starting session validation', {
      userId,
      deviceId,
      action: 'getValidSession',
    });
    try {
      // 1. Find session
      const session = await this.findSessionOrThrow({ userId, deviceId });

      // 2. Check if session has expired
      this.validateSessionExpiration(session);

      // 3. Log success and return session
      this.logger.info('Session validated successfully', {
        userId,
        deviceId,
        action: 'getValidSession',
      });
      return session;
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof SessionNotFoundException ||
        error instanceof SessionExpiredException ||
        error instanceof SessionRepositoryException
      ) {
        throw new SessionValidationException(error);
      }
      if (error instanceof SessionValidationException) {
        throw error;
      }
      this.logger.error('Error during session validation', error, {
        userId,
        deviceId,
        action: 'getValidSession',
      });
      throw new SessionValidationException(error as Error);
    }
  }

  /**
   * Verifies session exists and is valid.
   * @throws {SessionValidationException}
   */
  async verifySession({ userId, deviceId }: SelectSessionDto): Promise<void> {
    await this.getValidSession({ userId, deviceId });
  }

  /**
   * Deletes a specific session.
   *
   * Logs error if database operation fails.
   * @throws {SessionRepositoryException}
   */
  async deleteSession({
    userId,
    deviceId,
  }: SelectSessionDto): Promise<DatabaseSession | null> {
    this.logger.debug('Starting database session deletion', {
      userId,
      deviceId,
      action: 'deleteSession',
    });
    try {
      const deletedSession = await this.sessionRepository.delete(
        userId,
        deviceId,
      );
      if (!deletedSession) {
        throw new SessionRepositoryException(
          SessionRepositoryOperation.DELETE,
          userId,
          deviceId,
        );
      }
      this.logger.info('Session deleted successfully', {
        userId,
        deviceId,
        action: 'deleteSession',
      });
      return deletedSession;
    } catch (error) {
      this.logger.error('Database error during session delete', error, {
        userId,
        deviceId,
        action: 'deleteSession',
      });
      if (error instanceof SessionRepositoryException) {
        throw error;
      }
      // Truly unexpected errors
      throw new SessionRepositoryException(
        SessionRepositoryOperation.DELETE,
        userId,
        deviceId,
        error as Error,
      );
    }
  }

  /**
   * Removes all user sessions.
   *
   * Logs error if database operation fails
   * @throws {SessionRepositoryException}
   */
  async removeAllSessionsForUser(userId: string): Promise<DatabaseSession[]> {
    this.logger.debug('Starting session removal for user', {
      userId,
      action: 'removeAllSessionsForUser',
    });
    try {
      // 1. Delete all sessions for user
      const sessions = await this.sessionRepository.deleteAllForUser(userId);

      // 2. Log success and return sessions
      this.logger.info('Successfully removed all sessions for user', {
        userId,
        action: 'removeAllSessionsForUser',
      });
      return sessions;
    } catch (error) {
      this.logger.error('Failed to remove all sessions for user', error, {
        userId,
        action: 'removeAllSessionsForUser',
      });
      if (error instanceof SessionRepositoryException) {
        throw error;
      }
      throw new SessionRepositoryException(
        SessionRepositoryOperation.DELETE_ALL,
        userId,
        undefined,
        error as Error,
      );
    }
  }

  /* -------------- Scheduled Tasks -------------- */

  /**
   * Cleans up expired sessions daily.
   *
   * Wraps already logged repository errors.
   * @throws {SessionCleanupFailedException}
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpired(): Promise<void> {
    this.logger.debug('Starting expired sessions cleanup', {
      action: 'deleteExpired',
    });
    try {
      // 1. Delete expired sessions
      await this.sessionRepository.deleteExpired();

      // 2. Log success
      this.logger.info('Expired sessions cleanup completed', {
        action: 'deleteExpired',
      });
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (error instanceof SessionRepositoryException) {
        throw new SessionCleanupFailedException(error);
      }
      if (error instanceof SessionCleanupFailedException) {
        throw error;
      }
      this.logger.error('Failed to cleanup expired sessions', error, {
        action: 'deleteExpired',
      });
      throw new SessionCleanupFailedException(error as Error);
    }
  }

  /* -------------- Private Session Management -------------- */

  /**
   * Removes oldest sessions when user exceeds maximum limit.
   *
   * Wraps already logged repository errors.
   * @throws {EnforceSessionLimitException}
   */
  private async enforceSessionLimit(
    sessions: DatabaseSession[],
  ): Promise<void> {
    this.logger.debug('Starting session limit enforcement', {
      userId: sessions[0]!.userId,
      maxSessions: this.MAX_SESSIONS_PER_USER,
      action: 'enforceSessionLimit',
    });
    try {
      while (sessions.length > this.MAX_SESSIONS_PER_USER) {
        const oldest = sessions.reduce((a, b) =>
          a.lastUsedAt <= b.lastUsedAt ? a : b,
        );
        await this.deleteSession({
          userId: oldest.userId,
          deviceId: oldest.deviceId,
        });
        sessions.splice(sessions.indexOf(oldest), 1);
        this.logger.info('Removed oldest session due to limit', {
          userId: oldest.userId,
          deviceId: oldest.deviceId,
          action: 'enforceSessionLimit',
        });
      }
    } catch (error) {
      if (error instanceof SessionRepositoryException) {
        throw new EnforceSessionLimitException(sessions[0]!.userId, error);
      }
      if (error instanceof EnforceSessionLimitException) {
        throw error;
      }
      this.logger.error('Unexpected error enforcing session limit', error, {
        userId: sessions[0]!.userId,
        action: 'enforceSessionLimit',
      });
      throw new EnforceSessionLimitException(
        sessions[0]!.userId,
        error as Error,
      );
    }
  }

  /**
   * Removes existing session if present
   *
   * Bubbles up already logged errors from database operations
   * @throws {SessionRepositoryException}
   */
  private async cleanUpExistingSession(
    userSessions: DatabaseSession[],
    deviceId: string,
  ): Promise<void> {
    this.logger.debug('Starting session cleanup', {
      userId: userSessions[0]!.userId,
      deviceId,
      action: 'cleanUpExistingSession',
    });
    const userId = userSessions[0]!.userId;
    try {
      // 1. Find existing session
      const existingSession = userSessions.find(
        (session) => session.deviceId === deviceId,
      );

      // 2. Delete existing session if found
      if (existingSession) {
        this.logger.info('Existing session found, starting cleanup', {
          userId: existingSession.userId,
          deviceId: existingSession.deviceId,
          action: 'cleanUpExistingSession',
        });
        await this.deleteSession({
          userId: existingSession.userId,
          deviceId: existingSession.deviceId,
        });
      }
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (error instanceof SessionRepositoryException) {
        throw error;
      }
      // Unexpected error
      this.logger.error('Error during session cleanup', error, {
        userId,
        deviceId,
        action: 'cleanUpExistingSession',
      });
      throw new SessionRepositoryException(
        SessionRepositoryOperation.CLEANUP,
        userId,
        deviceId,
      );
    }
  }

  /**
   * Validates session expiration.
   *
   * Logs warning if session expired.
   * @throws {SessionExpiredException}
   */
  private validateSessionExpiration(session: DatabaseSession): void {
    if (session.expiresAt < new Date()) {
      this.logger.warn('Session expired', {
        userId: session.userId,
        deviceId: session.deviceId,
        action: 'validateSessionExpiration',
      });
      throw new SessionExpiredException();
    }
  }

  /* -------------- Private Database Operations -------------- */

  /**
   * Creates new session record.
   *
   * Logs error if database operation fails.
   * @throws {SessionRepositoryException}
   */
  private async createSession(
    newSession: CreateSessionWithTokenDto,
  ): Promise<DatabaseSession> {
    this.logger.debug('Starting database session creation', {
      userId: newSession.userId,
      deviceId: newSession.deviceId,
      action: 'createSession',
    });
    try {
      const session = await this.sessionRepository.create(newSession);
      if (!session) {
        throw new SessionRepositoryException(
          SessionRepositoryOperation.CREATE,
          newSession.userId,
          newSession.deviceId,
        );
      }
      return session;
    } catch (error) {
      this.logger.error('Database error during session creation', error, {
        userId: newSession.userId,
        deviceId: newSession.deviceId,
        action: 'createSession',
      });
      if (error instanceof SessionRepositoryException) {
        throw error;
      }
      // Truly unexpected errors
      throw new SessionRepositoryException(
        SessionRepositoryOperation.CREATE,
        newSession.userId,
        newSession.deviceId,
        error as Error,
      );
    }
  }

  /**
   * Gets session or throws if not found.
   *
   * Logs warning if session not found.
   *
   * Logs error if database operation fails.
   * @throws {SessionNotFoundException}
   * @throws {SessionRepositoryException}
   */
  private async findSessionOrThrow({
    userId,
    deviceId,
  }: SelectSessionDto): Promise<DatabaseSession> {
    this.logger.debug('Starting database session find', {
      userId,
      deviceId,
      action: 'findSessionOrThrow',
    });
    try {
      const session = await this.sessionRepository.findOne(userId, deviceId);
      if (!session) {
        throw new SessionNotFoundException();
      }
      return session;
    } catch (error) {
      if (error instanceof SessionNotFoundException) {
        this.logger.warn('Session not found', {
          userId,
          deviceId,
          action: 'findSessionOrThrow',
        });
        throw error;
      }
      this.logger.error('Database error during session find', error, {
        userId,
        deviceId,
        action: 'findSessionOrThrow',
      });
      throw new SessionRepositoryException(
        SessionRepositoryOperation.FIND,
        userId,
        deviceId,
        error as Error,
      );
    }
  }

  /**
   * Updates session timestamp and token.
   *
   * Logs error if database operation fails.
   * @throws {SessionRepositoryException}
   */
  private async updateSession(
    session: SessionUpdate,
  ): Promise<DatabaseSession> {
    this.logger.debug('Starting database session update', {
      userId: session.userId,
      deviceId: session.deviceId,
      action: 'updateSession',
    });
    try {
      const updatedSession = await this.sessionRepository.update(session);
      if (!updatedSession) {
        throw new SessionRepositoryException(
          SessionRepositoryOperation.UPDATE,
          session.userId!,
          session.deviceId,
        );
      }
      return updatedSession;
    } catch (error) {
      this.logger.error('Database error during session update', error, {
        userId: session.userId,
        deviceId: session.deviceId,
        action: 'update',
      });
      if (error instanceof SessionRepositoryException) {
        throw error;
      }
      // Truly unexpected errors
      throw new SessionRepositoryException(
        SessionRepositoryOperation.UPDATE,
        session.userId!,
        session.deviceId,
        error as Error,
      );
    }
  }

  /**
   * Gets all sessions for a user.
   *
   * Logs error if database operation fails.
   * @throws {SessionRepositoryException}
   */
  private async findAllByUserId(userId: string): Promise<DatabaseSession[]> {
    this.logger.debug('Starting database session find all by user ID', {
      userId,
      action: 'findAllByUserId',
    });
    try {
      return await this.sessionRepository.findAllByUserId(userId);
    } catch (error) {
      this.logger.error('Database error during session find all', error, {
        userId,
        action: 'findAllByUserId',
      });
      throw new SessionRepositoryException(
        SessionRepositoryOperation.FIND_ALL,
        userId,
        undefined,
        error as Error,
      );
    }
  }
}
