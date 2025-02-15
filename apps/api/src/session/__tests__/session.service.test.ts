import { LoggerService } from '@/logger/logger.service';
import { SessionCreationFailedException } from '@/session/exceptions/session-creation-failed.exception';
import { SessionExpiredException } from '@/session/exceptions/session-expired.exception';
import { SessionNotFoundException } from '@/session/exceptions/session-not-found.exception';
import { SessionRepositoryException } from '@/session/exceptions/session-repository.exception';
import { SessionRepository } from '@/session/session.repository';
import { SessionService } from '@/session/session.service';
import { DatabaseSession } from '@repo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hash, verify } from 'argon2';
import { InvalidRefreshTokenException } from '@/session/exceptions/invalid-refresh-token.exception';
import { SessionValidationException } from '@/session/exceptions/session-validation.exception';

// Mock argon2
vi.mock('argon2', () => ({
  hash: vi
    .fn()
    .mockImplementation((token) => Promise.resolve(`hashed_${token}`)),
  verify: vi
    .fn()
    .mockImplementation((hashedToken, plainToken) =>
      Promise.resolve(hashedToken === `hashed_${plainToken}`),
    ),
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  let sessionRepository: SessionRepository;
  let loggerService: LoggerService;

  // Mock data
  const mockUserId = 'user123';
  const mockDeviceId = 'device123';
  const mockRefreshToken = 'refresh123';
  const mockExpiresAt = new Date('2025-12-31');
  const mockHashedToken = 'hashed_refresh123';

  const mockSession: DatabaseSession = {
    userId: mockUserId,
    deviceId: mockDeviceId,
    token: mockHashedToken,
    expiresAt: mockExpiresAt,
    createdAt: new Date(),
    lastUsedAt: new Date(),
  };

  beforeEach(() => {
    // Create repository mock with void this context
    vi.clearAllMocks();
    sessionRepository = {
      findOne: vi.fn(function (this: void): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
      delete: vi.fn(function (this: void): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
      create: vi.fn(function (this: void): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
      updateLastUsedAt: vi.fn(function (
        this: void,
      ): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
    } as unknown as SessionRepository;

    // Create logger mock with void this context
    loggerService = {
      warn: vi.fn(function (this: void): void {}),
      debug: vi.fn(function (this: void): void {}),
      info: vi.fn(function (this: void): void {}),
      error: vi.fn(function (this: void): void {}),
    } as unknown as LoggerService;

    // Initialize service with mocks
    sessionService = new SessionService(sessionRepository, loggerService);
  });

  describe('createSessionWithToken', () => {
    it('should create a new session after deleting existing one', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(mockSession);
      vi.mocked(sessionRepository.delete).mockResolvedValueOnce(mockSession);
      vi.mocked(sessionRepository.create).mockResolvedValueOnce(mockSession);

      const result = await sessionService.createSessionWithToken(
        mockUserId,
        mockDeviceId,
        mockRefreshToken,
        mockExpiresAt,
      );

      expect(result).toEqual(mockSession);

      expect(sessionRepository.findOne).toHaveBeenCalledWith(
        mockUserId,
        mockDeviceId,
      );
      expect(sessionRepository.delete).toHaveBeenCalledWith(
        mockUserId,
        mockDeviceId,
      );
      expect(sessionRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        deviceId: mockDeviceId,
        token: mockHashedToken,
        expiresAt: mockExpiresAt,
      });

      expect(loggerService.debug).toHaveBeenCalledWith(
        'Creating new session with token...',
        { userId: mockUserId, deviceId: mockDeviceId },
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        'Session created successfully',
        { userId: mockUserId, deviceId: mockDeviceId },
      );
    });

    it('should create a new session when no existing session exists', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);
      vi.mocked(sessionRepository.create).mockResolvedValueOnce(mockSession);

      const result = await sessionService.createSessionWithToken(
        mockUserId,
        mockDeviceId,
        mockRefreshToken,
        mockExpiresAt,
      );

      expect(result).toEqual(mockSession);

      expect(sessionRepository.findOne).toHaveBeenCalledWith(
        mockUserId,
        mockDeviceId,
      );
      expect(sessionRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        deviceId: mockDeviceId,
        token: mockHashedToken,
        expiresAt: mockExpiresAt,
      });

      expect(loggerService.debug).toHaveBeenCalledWith(
        'Creating new session with token...',
        { userId: mockUserId, deviceId: mockDeviceId },
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        'Session created successfully',
        { userId: mockUserId, deviceId: mockDeviceId },
      );
    });

    it('should throw SessionCreationFailedException when repository fails to create a new session', async () => {
      const repositoryError = new SessionRepositoryException(
        'create',
        mockUserId,
        mockDeviceId,
        new Error('Database connection failed'),
      );
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);
      vi.mocked(sessionRepository.create).mockRejectedValueOnce(
        repositoryError,
      );

      await expect(
        sessionService.createSessionWithToken(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
          mockExpiresAt,
        ),
      ).rejects.toThrow(SessionCreationFailedException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session creation',
        repositoryError,
        {
          userId: mockUserId,
          deviceId: mockDeviceId,
        },
      );
    });

    it('should handle failure during existing session deletion', async () => {
      const repositoryError = new SessionRepositoryException(
        'delete',
        mockUserId,
        mockDeviceId,
        new Error('Delete failed'),
      );
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(mockSession);
      vi.mocked(sessionRepository.delete).mockRejectedValueOnce(
        repositoryError,
      );

      await expect(
        sessionService.createSessionWithToken(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
          mockExpiresAt,
        ),
      ).rejects.toThrow(SessionCreationFailedException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session delete',
        repositoryError,
        {
          userId: mockUserId,
          deviceId: mockDeviceId,
        },
      );

      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors during cleanup', async () => {
      const unexpectedError = new Error('Unexpected cleanup error');
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(
        unexpectedError,
      );

      await expect(
        sessionService.createSessionWithToken(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
          mockExpiresAt,
        ),
      ).rejects.toThrow(SessionCreationFailedException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session find',
        unexpectedError,
        { userId: mockUserId, deviceId: mockDeviceId },
      );
      expect(sessionRepository.delete).not.toHaveBeenCalled();
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should handle null return from repository create', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);
      vi.mocked(sessionRepository.create).mockResolvedValueOnce(null);

      await expect(
        sessionService.createSessionWithToken(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
          mockExpiresAt,
        ),
      ).rejects.toThrow(SessionCreationFailedException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session creation',
        expect.any(SessionRepositoryException),
        { userId: mockUserId, deviceId: mockDeviceId },
      );
    });

    it('should properly hash the refresh token', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);
      vi.mocked(sessionRepository.create).mockResolvedValueOnce(mockSession);

      await sessionService.createSessionWithToken(
        mockUserId,
        mockDeviceId,
        mockRefreshToken,
        mockExpiresAt,
      );

      expect(hash).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should preserve original error details in SessionCreationFailedException', async () => {
      const originalError = new Error('Original error message');
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(originalError);

      try {
        await sessionService.createSessionWithToken(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
          mockExpiresAt,
        );
        fail('Should have thrown an error');
      } catch (error) {
        const sessionError = error as SessionCreationFailedException;
        expect(sessionError).toBeInstanceOf(SessionCreationFailedException);
        const repoError = sessionError.cause as SessionRepositoryException;
        expect(repoError).toBeInstanceOf(SessionRepositoryException);
        expect(repoError.cause).toBe(originalError);
      }
    });
  });

  describe('validateSession', () => {
    it('should successfully validate a session with valid refresh token', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(mockSession);
      vi.mocked(sessionRepository.updateLastUsedAt).mockResolvedValueOnce(
        mockSession,
      );

      const result = await sessionService.validateSession(
        mockUserId,
        mockDeviceId,
        mockRefreshToken,
      );

      expect(result).toEqual(mockSession);
      expect(sessionRepository.findOne).toHaveBeenCalledWith(
        mockUserId,
        mockDeviceId,
      );

      expect(verify).toHaveBeenCalledWith(mockHashedToken, mockRefreshToken);

      expect(sessionRepository.updateLastUsedAt).toHaveBeenCalledWith(
        mockUserId,
        mockDeviceId,
      );
      expect(loggerService.debug).toHaveBeenCalledWith(
        'Validating session...',
        {
          userId: mockUserId,
          deviceId: mockDeviceId,
        },
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        'Session validated successfully',
        {
          userId: mockUserId,
          deviceId: mockDeviceId,
        },
      );
    });

    it('should throw SessionNotFoundException when session does not exist', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);

      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).rejects.toThrow(SessionNotFoundException);

      expect(loggerService.error).toHaveBeenCalledWith('Session not found', {
        userId: mockUserId,
        deviceId: mockDeviceId,
      });

      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should throw SessionExpiredException when session is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce({
        ...mockSession,
        expiresAt: expiredDate,
      });

      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).rejects.toThrow(SessionExpiredException);

      expect(loggerService.warn).toHaveBeenCalledWith('Session expired', {
        userId: mockUserId,
        deviceId: mockDeviceId,
      });

      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should throw InvalidRefreshTokenException when refresh token is invalid', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(mockSession);
      vi.mocked(verify).mockResolvedValueOnce(false);

      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).rejects.toThrow(InvalidRefreshTokenException);

      expect(loggerService.warn).toHaveBeenCalledWith('Invalid refresh token', {
        userId: mockUserId,
        deviceId: mockDeviceId,
      });

      expect(verify).toHaveBeenCalledWith(mockHashedToken, mockRefreshToken);
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should update lastUsedAt timestamp when session is valid', async () => {
      const originalLastUsedAt = new Date('2025-01-01');
      const updatedLastUsedAt = new Date('2025-01-02');

      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce({
        ...mockSession,
        lastUsedAt: originalLastUsedAt,
      });
      vi.mocked(sessionRepository.updateLastUsedAt).mockResolvedValueOnce({
        ...mockSession,
        lastUsedAt: updatedLastUsedAt,
      });
      vi.mocked(verify).mockResolvedValueOnce(true);

      const result = await sessionService.validateSession(
        mockUserId,
        mockDeviceId,
        mockRefreshToken,
      );

      expect(sessionRepository.updateLastUsedAt).toHaveBeenCalledWith(
        mockUserId,
        mockDeviceId,
      );

      expect(result.lastUsedAt).toEqual(updatedLastUsedAt);
      expect(result.lastUsedAt).not.toEqual(originalLastUsedAt);
    });

    it('should throw SessionValidationException when repository errors occur during find', async () => {
      const repositoryError = new SessionRepositoryException(
        'find',
        mockUserId,
        mockDeviceId,
        new Error('Database connection failed'),
      );
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(
        repositoryError,
      );

      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).rejects.toThrow(SessionValidationException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session find',
        repositoryError,
        {
          userId: mockUserId,
          deviceId: mockDeviceId,
        },
      );

      // Verify that subsequent operations were not called
      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should throw SessionValidationException when repository errors occur during lastUsedAt update', async () => {
      const repositoryError = new SessionRepositoryException(
        'update',
        mockUserId,
        mockDeviceId,
        new Error('Database update failed'),
      );

      // Mock successful session find and token verification
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(mockSession);
      vi.mocked(verify).mockResolvedValueOnce(true);

      // Mock failure during lastUsedAt update
      vi.mocked(sessionRepository.updateLastUsedAt).mockRejectedValueOnce(
        repositoryError,
      );

      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).rejects.toThrow(SessionValidationException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session update',
        repositoryError,
        {
          userId: mockUserId,
          deviceId: mockDeviceId,
        },
      );

      // Verify that the session was found and token was verified before error
      expect(sessionRepository.findOne).toHaveBeenCalledWith(
        mockUserId,
        mockDeviceId,
      );
      expect(verify).toHaveBeenCalledWith(mockHashedToken, mockRefreshToken);
    });

    it('should preserve repository error details in SessionValidationException', async () => {
      // Create a database error
      const databaseError = new Error('Database connection lost');

      // Mock the repository to throw the database error
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(databaseError);

      try {
        await sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        );
        fail('Should have thrown an error');
      } catch (error) {
        // Verify error chain with strong typing
        expect(error).toBeInstanceOf(SessionValidationException);
        const sessionError = error as SessionValidationException;

        // Access the cause (which should be the repository error)
        const cause = sessionError.cause;
        expect(cause).toBeInstanceOf(SessionRepositoryException);
        const repoError = cause as SessionRepositoryException;

        // Verify the original database error is preserved
        expect(repoError.cause).toBe(databaseError);

        // Verify the session validation message
        expect(sessionError.message).toBe('Failed to validate session');

        // Verify repository error message format
        expect(repoError.message).toBe(
          `Failed to find session for user ${mockUserId} and device ${mockDeviceId}`,
        );

        // Verify logging - the original database error is logged before being wrapped
        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session find',
          databaseError,
          {
            userId: mockUserId,
            deviceId: mockDeviceId,
          },
        );
      }
    });

    it('should throw SessionValidationException with correct message for unexpected errors', async () => {
      // Instead of TypeError, we should simulate a lower-level database error
      // that would actually come from the repository layer
      const databaseError = new Error('Database connection error');
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(databaseError);

      try {
        await sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const sessionError = error as SessionValidationException;

        // Verify the error chain
        expect(sessionError.cause).toBeInstanceOf(SessionRepositoryException);
        const repoError = sessionError.cause as SessionRepositoryException;
        expect(repoError.cause).toBe(databaseError);

        // Verify error messages
        expect(sessionError.message).toBe('Failed to validate session');
        expect(repoError.message).toBe(
          `Failed to find session for user ${mockUserId} and device ${mockDeviceId}`,
        );

        // Verify logging
        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session find',
          databaseError,
          {
            userId: mockUserId,
            deviceId: mockDeviceId,
          },
        );
      }

      // Verify that subsequent operations were not called
      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should handle null session return from repository correctly', async () => {
      // Mock findOne to return null
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);

      // Attempt to validate the session
      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).rejects.toThrow(SessionNotFoundException);

      // Verify error was logged
      expect(loggerService.error).toHaveBeenCalledWith('Session not found', {
        userId: mockUserId,
        deviceId: mockDeviceId,
      });

      // Verify that token verification was not attempted
      expect(verify).not.toHaveBeenCalled();

      // Verify that lastUsedAt was not updated
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should validate session dates properly across different timezones', async () => {
      // Create a session that expires at a specific UTC time
      const utcExpiryDate = new Date('2024-01-01T00:00:00Z'); // Z indicates UTC

      const sessionWithUTCDate = {
        ...mockSession,
        expiresAt: utcExpiryDate,
      };

      // Mock findOne to return the session for both calls
      vi.mocked(sessionRepository.findOne)
        .mockResolvedValueOnce(sessionWithUTCDate) // First call (before expiry)
        .mockResolvedValueOnce(sessionWithUTCDate); // Second call (after expiry)

      vi.mocked(sessionRepository.updateLastUsedAt).mockResolvedValueOnce(
        sessionWithUTCDate,
      );

      // Mock current time to be just before expiry in UTC
      const justBeforeExpiry = new Date('2023-12-31T23:59:59Z');
      vi.setSystemTime(justBeforeExpiry);

      // Should validate successfully because we're before expiry
      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).resolves.toBeDefined();

      // Mock current time to be just after expiry in UTC
      const justAfterExpiry = new Date('2024-01-01T00:00:01Z');
      vi.setSystemTime(justAfterExpiry);

      // Should fail with expiry error regardless of local timezone
      await expect(
        sessionService.validateSession(
          mockUserId,
          mockDeviceId,
          mockRefreshToken,
        ),
      ).rejects.toThrow(SessionExpiredException);

      // Reset system time
      vi.useRealTimers();
    });
  });
});
