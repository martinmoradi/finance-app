import { LoggerService } from '@/logger/logger.service';
import {
  createMockSession,
  mockSessionData,
} from '@/session/__tests__/session.fixtures';
import {
  SessionCreationFailedException,
  SessionExpiredException,
  SessionNotFoundException,
  SessionRepositoryException,
  SessionValidationException,
} from '@/session/exceptions';
import { SessionRepository } from '@/session/session.repository';
import { SessionService } from '@/session/session.service';
import { Test, TestingModule } from '@nestjs/testing';
import { hash, verify } from 'argon2';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest
    .fn()
    .mockImplementation((token) => Promise.resolve(`hashed_${token}`)),
  verify: jest
    .fn()
    .mockImplementation((hashedToken, plainToken) =>
      Promise.resolve(hashedToken === `hashed_${plainToken}`),
    ),
}));

describe('SessionService', () => {
  let service: SessionService;
  let repository: jest.Mocked<SessionRepository>;
  let logger: jest.Mocked<LoggerService>;
  let fakeNow: Date;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    fakeNow = new Date('2025-01-01');
    jest.setSystemTime(fakeNow);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: SessionRepository,
          useValue: {
            findOne: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
            updateLastUsedAt: jest.fn(),
            findAllByUserId: jest.fn(),
            deleteAllForUser: jest.fn(),
            deleteExpired: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    repository = module.get(SessionRepository);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSessionWithToken', () => {
    const { userId, deviceId, refreshToken, expiresAt } = mockSessionData;
    const expectedSession = createMockSession();

    describe('success cases', () => {
      it('should create a new session when no existing session exists', async () => {
        repository.findAllByUserId.mockResolvedValue([]);
        repository.create.mockResolvedValue(expectedSession);

        const result = await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(result).toEqual(expectedSession);
        expect(repository.create).toHaveBeenCalledWith({
          userId,
          deviceId,
          token: `hashed_${refreshToken}`,
          expiresAt,
        });
        expect(logger.debug).toHaveBeenCalledWith(
          'Creating new session with token...',
          { userId, deviceId },
        );
        expect(logger.info).toHaveBeenCalledWith(
          'Session created successfully',
          { userId, deviceId },
        );
      });

      it('should create a new session after deleting existing one', async () => {
        const existingSession = createMockSession({
          expiresAt: new Date('2025-01-10'),
          lastUsedAt: new Date('2024-12-29'),
          createdAt: new Date('2024-12-27'),
        });

        repository.findAllByUserId.mockResolvedValue([existingSession]);
        repository.delete.mockResolvedValue(existingSession);
        repository.create.mockResolvedValue(expectedSession);

        const result = await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(result).toEqual(expectedSession);
        expect(repository.delete).toHaveBeenCalledWith(userId, deviceId);
        expect(logger.info).toHaveBeenCalledWith(
          'Existing session found, deleting...',
          { userId, deviceId },
        );
      });

      it('should create new session for a new device when user has 4 sessions on other devices', async () => {
        repository.findAllByUserId.mockResolvedValue([
          createMockSession({ deviceId: 'device1' }),
          createMockSession({ deviceId: 'device2' }),
          createMockSession({ deviceId: 'device3' }),
          createMockSession({ deviceId: 'device4' }),
        ]);
        repository.create.mockResolvedValue(expectedSession);

        const result = await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(result.userId).toEqual(userId);
        expect(result.deviceId).toEqual(deviceId);
        expect(result.token).toEqual(`hashed_${refreshToken}`);
        expect(result.expiresAt).toEqual(expiresAt);
        expect(result.createdAt).toEqual(fakeNow);
        expect(result.lastUsedAt).toEqual(fakeNow);

        expect(logger.debug).toHaveBeenCalledWith(
          'Creating new session with token...',
          { userId, deviceId },
        );
        expect(logger.info).not.toHaveBeenCalledWith(
          'Existing session found, deleting...',
          { userId, deviceId },
        );
        expect(logger.info).toHaveBeenCalledWith(
          'Session created successfully',
          { userId, deviceId },
        );
      });

      it('should properly hash the refresh token', async () => {
        repository.findAllByUserId.mockResolvedValue([]); // No existing session
        repository.create.mockResolvedValue(expectedSession);

        await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(hash).toHaveBeenCalledWith(refreshToken);
      });
    });

    describe('session limit handling', () => {
      it('should create new session with exactly MAX_SESSIONS_PER_USER existing sessions', async () => {
        const existingSessions = Array.from({ length: 5 }, (_, i) =>
          createMockSession({
            deviceId: `device${i + 1}`,
            lastUsedAt: new Date(`2024-12-${27 + i}`),
          }),
        );

        repository.findAllByUserId.mockResolvedValue(existingSessions);
        repository.create.mockResolvedValue(expectedSession);

        await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(repository.delete).toHaveBeenCalledTimes(1);
        expect(repository.delete).toHaveBeenCalledWith(userId, 'device1');
      });

      it('should handle cleanup of multiple sessions when well over the limit', async () => {
        const existingSessions = Array.from({ length: 7 }, (_, i) =>
          createMockSession({
            deviceId: `device${i + 1}`,
            lastUsedAt: new Date(`2024-12-${25 + i}`),
            createdAt: new Date(`2024-12-${20 + i}`),
          }),
        );

        repository.findAllByUserId.mockResolvedValue(existingSessions);
        repository.create.mockResolvedValue(expectedSession);

        // Create a strongly typed array of sessions to be deleted
        const [session1, session2, session3] = existingSessions;

        // Ensure each mock resolves with a non-null value
        repository.delete
          .mockResolvedValueOnce(session1!)
          .mockResolvedValueOnce(session2!)
          .mockResolvedValueOnce(session3!);

        await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(repository.delete).toHaveBeenCalledTimes(3);
        expect(repository.delete).toHaveBeenNthCalledWith(1, userId, 'device1');
        expect(repository.delete).toHaveBeenNthCalledWith(2, userId, 'device2');
        expect(repository.delete).toHaveBeenNthCalledWith(3, userId, 'device3');
      });

      it('should preserve newer sessions when cleaning up old ones', async () => {
        const newerSessions = [
          createMockSession({
            deviceId: 'device1',
            lastUsedAt: new Date('2024-12-31'),
            createdAt: new Date('2024-12-30'),
          }),
          createMockSession({
            deviceId: 'device2',
            lastUsedAt: new Date('2024-12-30'),
            createdAt: new Date('2024-12-29'),
          }),
        ] as const; // Make the array readonly to prevent TypeScript from inferring undefined

        const olderSession = createMockSession({
          deviceId: 'device3',
          lastUsedAt: new Date('2024-12-25'),
          createdAt: new Date('2024-12-20'),
        });

        repository.findAllByUserId.mockResolvedValue([
          ...newerSessions,
          olderSession,
        ]);
        repository.create.mockResolvedValue(expectedSession);

        await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(repository.delete).not.toHaveBeenCalledWith(
          userId,
          newerSessions[0].deviceId,
        );
        expect(repository.delete).not.toHaveBeenCalledWith(
          userId,
          newerSessions[1].deviceId,
        );
      });
    });

    describe('error handling', () => {
      it('should handle error during token hashing', async () => {
        const hashingError = new Error('Argon2 hashing failed');
        (hash as jest.Mock).mockRejectedValueOnce(hashingError);
        repository.findAllByUserId.mockResolvedValue([]);

        await expect(
          service.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
          ),
        ).rejects.toThrow(SessionCreationFailedException);

        expect(hash).toHaveBeenCalledWith(refreshToken);
        expect(logger.error).toHaveBeenCalledWith(
          'Unexpected error during session creation',
          hashingError,
          { userId, deviceId },
        );
        expect(repository.create).not.toHaveBeenCalled();
      });

      it('should preserve original error details in SessionCreationFailedException', async () => {
        const originalError = new Error('Original error message');
        repository.findAllByUserId.mockRejectedValue(originalError);

        try {
          await service.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
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

      it('should handle invalid token format', async () => {
        // Mock hash to throw error for invalid tokens
        (hash as jest.Mock).mockImplementation((token) => {
          if (!token || typeof token !== 'string' || token.length > 512) {
            throw new Error('Invalid token format');
          }
          return Promise.resolve(`hashed_${token}`);
        });

        const invalidTokens = [
          '', // empty string
          null, // null value
          undefined, // undefined
          12345, // number
          { token: 'invalid' }, // object
          'a'.repeat(513), // exceeds 512 character limit
        ];

        for (const invalidToken of invalidTokens) {
          repository.findAllByUserId.mockResolvedValue([]); // Reset for each iteration

          await expect(
            service.createSessionWithToken(
              userId,
              deviceId,
              invalidToken as any, // Force invalid type
              expiresAt,
            ),
          ).rejects.toThrow(SessionCreationFailedException);

          expect(logger.error).toHaveBeenCalledWith(
            'Unexpected error during session creation',
            expect.any(Error),
            {
              userId,
              deviceId,
            },
          );

          expect(repository.create).not.toHaveBeenCalled();
        }

        // Reset hash mock after test
        (hash as jest.Mock).mockImplementation((token) =>
          Promise.resolve(`hashed_${token}`),
        );
      });

      it('should complete session creation even if limit enforcement fails', async () => {
        const repositoryError = new SessionRepositoryException(
          'delete',
          userId,
          deviceId,
          new Error('Delete failed'),
        );
        const existingSessions = Array.from({ length: 5 }, (_, i) =>
          createMockSession({
            deviceId: `device${i + 1}`,
            lastUsedAt: new Date(`2024-12-${27 + i}`),
          }),
        );

        repository.findAllByUserId.mockResolvedValue(existingSessions);
        repository.create.mockResolvedValue(expectedSession);
        repository.delete.mockRejectedValue(repositoryError);

        const result = await service.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        // Session should still be created
        expect(result).toEqual(expectedSession);

        // Error should be logged
        expect(logger.error).toHaveBeenCalledWith(
          'Error enforcing session limit',
          expect.any(Error),
          { userId },
        );
      });
    });
  });

  describe('validateSession', () => {
    const { userId, deviceId, refreshToken } = mockSessionData;
    const mockSession = createMockSession();

    it('should successfully validate a session with valid refresh token', async () => {
      repository.findOne.mockResolvedValue(mockSession);
      repository.updateLastUsedAt.mockResolvedValue(mockSession);

      const result = await service.validateSession(
        userId,
        deviceId,
        refreshToken,
      );

      expect(result).toEqual(mockSession);
      expect(verify).toHaveBeenCalledWith(mockSession.token, refreshToken);
      expect(repository.updateLastUsedAt).toHaveBeenCalledWith(
        userId,
        deviceId,
      );
    });

    it('should update lastUsedAt timestamp when session is valid', async () => {
      const originalLastUsedAt = new Date('2025-01-01');
      const updatedLastUsedAt = new Date('2025-01-02');

      repository.findOne.mockResolvedValue({
        ...mockSession,
        lastUsedAt: originalLastUsedAt,
      });
      repository.updateLastUsedAt.mockResolvedValue({
        ...mockSession,
        lastUsedAt: updatedLastUsedAt,
      });
      (verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateSession(
        userId,
        deviceId,
        refreshToken,
      );

      expect(repository.updateLastUsedAt).toHaveBeenCalledWith(
        userId,
        deviceId,
      );

      expect(result.lastUsedAt).toEqual(updatedLastUsedAt);
      expect(result.lastUsedAt).not.toEqual(originalLastUsedAt);
    });

    it('should preserve repository error details in SessionValidationException', async () => {
      // Create a database error
      const databaseError = new Error('Database connection lost');

      // Mock the repository to throw the database error
      repository.findOne.mockRejectedValue(databaseError);

      try {
        await service.validateSession(userId, deviceId, refreshToken);
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
          `Failed to find session for user ${userId} and device ${deviceId}`,
        );

        // Verify logging - the original database error is logged before being wrapped
        expect(logger.error).toHaveBeenCalledWith(
          'Database error during session find',
          databaseError,
          {
            userId,
            deviceId,
          },
        );
      }
    });

    it('should throw SessionValidationException with correct message for unexpected errors', async () => {
      // Simulate a lower-level database error from the repository layer
      const databaseError = new Error('Database connection error');
      repository.findOne.mockRejectedValue(databaseError);

      try {
        await service.validateSession(userId, deviceId, refreshToken);
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
          `Failed to find session for user ${userId} and device ${deviceId}`,
        );

        // Verify logging
        expect(logger.error).toHaveBeenCalledWith(
          'Database error during session find',
          databaseError,
          {
            userId,
            deviceId,
          },
        );
      }

      // Verify that subsequent operations were not called
      expect(verify).not.toHaveBeenCalled();
      expect(repository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    describe('timezone handling', () => {
      it('should validate session dates properly across different timezones', async () => {
        // Create a session that expires at a specific UTC time
        const utcExpiryDate = new Date('2024-01-01T00:00:00Z'); // Z indicates UTC

        const sessionWithUTCDate = {
          ...createMockSession(),
          expiresAt: utcExpiryDate,
        };

        // Mock findOne to return the session for both calls
        repository.findOne
          .mockResolvedValueOnce(sessionWithUTCDate) // First call (before expiry)
          .mockResolvedValueOnce(sessionWithUTCDate); // Second call (after expiry)

        repository.updateLastUsedAt.mockResolvedValue(sessionWithUTCDate);

        // Mock current time to be just before expiry in UTC
        const justBeforeExpiry = new Date('2023-12-31T23:59:59Z');
        jest.setSystemTime(justBeforeExpiry);

        // Should validate successfully because we're before expiry
        await expect(
          service.validateSession(userId, deviceId, refreshToken),
        ).resolves.toBeDefined();

        // Mock current time to be just after expiry in UTC
        const justAfterExpiry = new Date('2024-01-01T00:00:01Z');
        jest.setSystemTime(justAfterExpiry);

        // Should fail with expiry error regardless of local timezone
        await expect(
          service.validateSession(userId, deviceId, refreshToken),
        ).rejects.toThrow(SessionExpiredException);

        // Reset system time
        jest.useRealTimers();
      });
    });

    describe('error handling', () => {
      it('should handle null session return from repository correctly', async () => {
        repository.findOne.mockResolvedValue(null);

        await expect(
          service.validateSession(userId, deviceId, refreshToken),
        ).rejects.toThrow(SessionNotFoundException);

        expect(logger.error).toHaveBeenCalledWith('Session not found', {
          userId,
          deviceId,
        });
        expect(verify).not.toHaveBeenCalled();
        expect(repository.updateLastUsedAt).not.toHaveBeenCalled();
      });

      it('should throw SessionValidationException when repository errors occur during lastUsedAt update', async () => {
        const repositoryError = new SessionRepositoryException(
          'update',
          userId,
          deviceId,
          new Error('Database update failed'),
        );

        repository.findOne.mockResolvedValue(createMockSession());
        (verify as jest.Mock).mockResolvedValue(true);
        repository.updateLastUsedAt.mockRejectedValue(repositoryError);

        await expect(
          service.validateSession(userId, deviceId, refreshToken),
        ).rejects.toThrow(SessionValidationException);

        expect(logger.error).toHaveBeenCalledWith(
          'Database error during session update',
          repositoryError,
          { userId, deviceId },
        );
      });
    });
  });

  describe('findAndVerifySession', () => {
    const { userId, deviceId } = mockSessionData;
    const validSession = createMockSession();

    it('should return valid session when exists and not expired', async () => {
      repository.findOne.mockResolvedValue(validSession);

      const result = await service.findAndVerifySession(userId, deviceId);

      expect(result).toEqual(validSession);
      expect(repository.findOne).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should throw SessionNotFoundException when session does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionNotFoundException);

      expect(logger.error).toHaveBeenCalledWith('Session not found', {
        userId,
        deviceId,
      });
    });

    it('should throw SessionExpiredException when session is expired', async () => {
      const expiredSession = createMockSession({
        expiresAt: new Date('2024-01-01'),
      });
      repository.findOne.mockResolvedValue(expiredSession);

      await expect(
        service.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionExpiredException);
    });

    it('should throw SessionValidationException on repository error', async () => {
      const repoError = new SessionRepositoryException(
        'find',
        userId,
        deviceId,
        new Error('Database error'),
      );
      repository.findOne.mockRejectedValue(repoError);

      await expect(
        service.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionValidationException);

      expect(logger.error).toHaveBeenCalledWith(
        'Database error during session find',
        repoError,
        { userId, deviceId },
      );
    });

    it('should preserve error chain in SessionValidationException', async () => {
      const originalError = new Error('Connection timeout');
      repository.findOne.mockRejectedValue(originalError);

      try {
        await service.findAndVerifySession(userId, deviceId);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const sessionError = error as SessionValidationException;
        const repoError = sessionError.cause as SessionRepositoryException;
        expect(repoError.cause).toBe(originalError);
      }
    });

    it('should handle timezone differences in expiration check', async () => {
      const utcExpiry = new Date('2024-01-01T00:00:00Z');
      const sessionWithUTC = createMockSession({ expiresAt: utcExpiry });

      // Test in local timezone just before expiry
      jest.setSystemTime(new Date('2023-12-31T23:59:59Z'));
      repository.findOne.mockResolvedValue(sessionWithUTC);
      await expect(
        service.findAndVerifySession(userId, deviceId),
      ).resolves.toBeDefined();

      // Test in local timezone just after expiry
      jest.setSystemTime(new Date('2024-01-01T00:00:01Z'));
      repository.findOne.mockResolvedValue(sessionWithUTC);
      await expect(
        service.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionExpiredException);
    });
  });

  describe('removeAllSessionsForUser', () => {
    it('should successfully remove all sessions for a user', async () => {
      const userId = 'user123';
      const sessions = [createMockSession(), createMockSession()];
      repository.deleteAllForUser.mockResolvedValue(sessions);

      const result = await service.removeAllSessionsForUser(userId);

      expect(result).toEqual(sessions);
      expect(logger.info).toHaveBeenCalledWith(
        'Successfully removed all sessions for user',
        { userId },
      );
    });
  });

  describe('deleteExpired', () => {
    it('should successfully clean up expired sessions', async () => {
      await service.deleteExpired();

      expect(repository.deleteExpired).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Expired sessions cleanup completed',
      );
    });

    it('should handle repository errors during cleanup', async () => {
      const error = new Error('Database error');
      repository.deleteExpired.mockRejectedValue(error);

      await expect(service.deleteExpired()).rejects.toThrow(
        'Failed to cleanup expired sessions',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cleanup expired sessions',
        error,
      );
    });
  });
});
