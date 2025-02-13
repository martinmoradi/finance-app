import { SessionRepository } from '@/session/session.repository';
import { LoggerService } from '@/logger/logger.service';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseSession } from '@repo/types';
import { CreateSession } from '@repo/validation';
import { hash, verify } from 'argon2';

/**
 * Service responsible for managing  user sessions including creation,
 * validation, and cleanup of sessions.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger = new LoggerService('SessionService');
  }

  /* -------------- Core Session Management Methods -------------- */

  /**
   * Creates a new session with a hashed refresh token.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier for the session
   * @param refreshToken - Refresh token to be hashed and stored
   * @param expiresAt - Session expiration date
   * @returns Promise containing the created session
   * @throws {InternalServerErrorException} When session creation fails
   */
  async createSessionWithToken(
    userId: string,
    deviceId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<DatabaseSession> {
    try {
      this.logger.debug('Creating new session with token', {
        userId,
        deviceId,
      });

      const existingSession = await this.findSession(userId, deviceId);
      if (existingSession) {
        await this.deleteSession(userId, deviceId);
      }

      const hashedToken = await hash(refreshToken);
      const session = await this.createSession({
        userId,
        deviceId,
        token: hashedToken,
        expiresAt,
      });

      if (!session) {
        this.logger.error('Failed to create session', {
          userId,
          deviceId,
        });
        throw new InternalServerErrorException('Failed to create session');
      }

      this.logger.info('Session created successfully', {
        userId,
        deviceId,
      });
      return session;
    } catch (error) {
      this.logger.error('Error creating session', error, {
        userId,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Validates an existing session using the refresh token.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier for the session
   * @param refreshToken - Refresh token to validate
   * @returns Promise containing the validated session
   * @throws {UnauthorizedException} When session is invalid, expired or not found
   */
  async validateSession(
    userId: string,
    deviceId: string,
    refreshToken: string,
  ): Promise<DatabaseSession> {
    try {
      this.logger.debug('Validating session', {
        userId,
        deviceId,
      });

      const session = await this.findSession(userId, deviceId);
      if (!session) {
        this.logger.warn('Session not found during validation', {
          userId,
          deviceId,
        });
        throw new UnauthorizedException('Session not found');
      }

      if (session.expiresAt < new Date()) {
        this.logger.warn('Expired session detected', {
          userId,
          deviceId,
        });
        throw new UnauthorizedException('Session expired');
      }

      const isRefreshTokenValid = await verify(session.token, refreshToken);
      if (!isRefreshTokenValid) {
        this.logger.warn('Invalid refresh token', {
          userId,
          deviceId,
        });
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.updateLastUsedAt(userId, deviceId);
      this.logger.info('Session validated successfully', {
        userId,
        deviceId,
      });
      return session;
    } catch (error) {
      this.logger.error('Error validating session', error, {
        userId,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Enforces maximum number of sessions per user.
   * Removes oldest session if limit is exceeded.
   *
   * @param userId - User's unique identifier
   * @param maxSessions - Maximum allowed concurrent sessions
   */
  async enforceSessionLimit(userId: string, maxSessions: 5): Promise<void> {
    try {
      this.logger.debug('Enforcing session limit', {
        userId,
        maxSessions,
      });

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
      this.logger.error('Error enforcing session limit', error, {
        userId,
      });
      throw error;
    }
  }

  /* -------------- Session Query Methods -------------- */

  /**
   * Creates a new session entry.
   *
   * @param newSession - Session data to create
   * @returns Promise containing the created session or null
   */
  async createSession(
    newSession: CreateSession,
  ): Promise<DatabaseSession | null> {
    try {
      return await this.sessionRepository.create(newSession);
    } catch (error) {
      this.logger.error('Error creating session entry', error, {
        userId: newSession.userId,
      });
      throw error;
    }
  }

  /**
   * Finds a session by user and device IDs.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier
   * @returns Promise containing the found session or null
   */
  async findSession(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    try {
      return await this.sessionRepository.findOne(userId, deviceId);
    } catch (error) {
      this.logger.error('Error finding session', error, {
        userId,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Updates the lastUsedAt timestamp for a session.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier
   * @returns Promise containing the updated session or null
   */
  async updateLastUsedAt(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    try {
      return await this.sessionRepository.updateLastUsedAt(userId, deviceId);
    } catch (error) {
      this.logger.error('Error updating session last used timestamp', error, {
        userId,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Retrieves all sessions for a user.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing array of sessions
   */
  async findAllByUserId(userId: string): Promise<DatabaseSession[]> {
    try {
      return await this.sessionRepository.findAllByUserId(userId);
    } catch (error) {
      this.logger.error('Error finding user sessions', error, {
        userId,
      });
      throw error;
    }
  }

  /* -------------- Session Cleanup Methods -------------- */

  /**
   * Deletes a specific session.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier
   * @returns Promise containing the deleted session or null
   */
  async deleteSession(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    try {
      this.logger.debug('Deleting session', {
        userId,
        deviceId,
      });
      return await this.sessionRepository.delete(userId, deviceId);
    } catch (error) {
      this.logger.error('Error deleting session', error, {
        userId,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Removes all sessions for a specific user.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing array of deleted sessions
   */
  async removeAllSessionsForUser(userId: string): Promise<DatabaseSession[]> {
    try {
      this.logger.debug('Removing all sessions for user', {
        userId,
      });
      return await this.sessionRepository.deleteAllForUser(userId);
    } catch (error) {
      this.logger.error('Error removing all user sessions', error, { userId });
      throw error;
    }
  }

  /**
   * Automatically removes expired sessions at midnight.
   *
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpired(): Promise<void> {
    try {
      this.logger.debug('Running expired sessions cleanup');
      await this.sessionRepository.deleteExpired();
      this.logger.info('Expired sessions cleanup completed');
    } catch (error) {
      this.logger.error('Error cleaning up expired sessions', error);
      throw error;
    }
  }
}
