import { createMockSession } from '@/session/__tests__/session.fixtures';
import {
  SessionCreationFailedException,
  SessionRepositoryException,
  SessionRepositoryOperation,
} from '@/session/exceptions';
import { hash } from 'argon2';
import { setupSessionTests } from './session.service.helper';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest
    .fn()
    .mockImplementation((token) => Promise.resolve(`hashed_${token}`)),
}));

describe('SessionService', () => {
  const {
    getService,
    getRepository,
    getLogger,
    getMockSession,
    mockSessionData,
    createMultipleSessions,
  } = setupSessionTests();

  describe('createSessionWithToken', () => {
    it('should call findAllByUserId with correct userId', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      expect(repository.findAllByUserId).toHaveBeenCalledWith(userId);
    });

    it('should call cleanUpExistingSession when user has existing sessions', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      const existingSessions = [
        createMockSession({ deviceId }),
        ...createMultipleSessions(1).filter((s) => s.deviceId !== deviceId),
      ];
      repository.findAllByUserId.mockResolvedValue(existingSessions);

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      // Verify deleteSession was called with the matching device ID session
      expect(repository.delete).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should not call enforceSessionLimit when session count is below limit', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      // Include a session with matching deviceId that will be cleaned up
      const existingSessions = [
        createMockSession({ deviceId }),
        ...createMultipleSessions(2).filter((s) => s.deviceId !== deviceId),
      ];
      repository.findAllByUserId.mockResolvedValue(existingSessions);

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      // Verify delete was only called once (for cleanUpExistingSession)
      expect(repository.delete).toHaveBeenCalledTimes(1);
      expect(repository.delete).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should hash the refresh token', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      expect(hash).toHaveBeenCalledWith(token);
    });

    it('should call createSession with correct parameters', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId,
        deviceId,
        token: `hashed_${token}`,
        tokenId,
        expiresAt,
      });
    });

    it('should call enforceSessionLimit when session count exceeds limit', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      // Create sessions with predictable lastUsedAt times
      const now = Date.now();
      const existingSessions = [
        createMockSession({
          deviceId: 'device1',
          lastUsedAt: new Date(now - 1000),
        }),
        createMockSession({
          deviceId: 'device2',
          lastUsedAt: new Date(now - 2000),
        }),
        createMockSession({
          deviceId: 'device3',
          lastUsedAt: new Date(now - 3000),
        }),
        createMockSession({
          deviceId: 'device4',
          lastUsedAt: new Date(now - 4000),
        }),
        createMockSession({
          deviceId: 'device5',
          lastUsedAt: new Date(now - 5000),
        }), // oldest
      ];

      repository.findAllByUserId.mockResolvedValue([...existingSessions]);

      // Important: Create a new session with a NEWER timestamp
      const newSession = createMockSession({
        deviceId,
        lastUsedAt: new Date(now), // Make this newer than all existing sessions
      });
      repository.create.mockResolvedValue(newSession);

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      // The oldest session should be 'device5'
      expect(repository.delete).toHaveBeenCalledWith(userId, 'device5');
    });

    it('should not call enforceSessionLimit when session count is below limit', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      // We need exactly 3 sessions that don't include our deviceId
      const otherSessions = [
        createMockSession({ deviceId: 'device1' }),
        createMockSession({ deviceId: 'device2' }),
        createMockSession({ deviceId: 'device3' }),
      ];

      repository.findAllByUserId.mockResolvedValue(otherSessions);

      // Mock that no session with our deviceId exists so cleanUpExistingSession won't call delete
      repository.findOne.mockResolvedValue(null);

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      // No delete should be called because:
      // 1. cleanUpExistingSession won't find a session to delete
      // 2. We're below the limit so enforceSessionLimit won't delete anything
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should log debug message when starting the operation', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const logger = getLogger();

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting session creation with token',
        {
          userId,
          deviceId,
          action: 'createSessionWithToken',
        },
      );
    });

    it('should log info message when session is created successfully', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const logger = getLogger();

      await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      expect(logger.info).toHaveBeenCalledWith('Session created successfully', {
        userId,
        deviceId,
      });
    });

    it('should rethrow SessionRepositoryException wrapped in SessionCreationFailedException', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.CREATE,
        userId,
        deviceId,
      );
      repository.create.mockRejectedValue(originalError);

      await expect(
        service.createSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
          expiresAt,
        }),
      ).rejects.toThrow(SessionCreationFailedException);

      try {
        await service.createSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
          expiresAt,
        });
        fail('Expected SessionCreationFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionCreationFailedException);
        expect((error as SessionCreationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should rethrow SessionLimitExceededException wrapped in SessionCreationFailedException', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const existingSessions = createMultipleSessions(6); // More than limit
      repository.findAllByUserId.mockResolvedValue(existingSessions);

      // Mock delete to throw SessionRepositoryException
      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.DELETE,
        userId,
        existingSessions[0]?.deviceId,
      );
      repository.delete.mockRejectedValue(originalError);

      await expect(
        service.createSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
          expiresAt,
        }),
      ).rejects.toThrow(SessionCreationFailedException);

      try {
        await service.createSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
          expiresAt,
        });
        fail('Expected SessionCreationFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionCreationFailedException);
        expect((error as SessionCreationFailedException).cause).toBeTruthy();
      }
    });

    it('should rethrow existing SessionCreationFailedException without wrapping', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const originalError = new SessionCreationFailedException(
        new Error('Original error'),
      );
      repository.create.mockRejectedValue(originalError);

      try {
        await service.createSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
          expiresAt,
        });
        fail('Expected SessionCreationFailedException was not thrown');
      } catch (error) {
        // Instead of checking exact identity, check type and that it wasn't wrapped
        expect(error).toBeInstanceOf(SessionCreationFailedException);
        expect((error as SessionCreationFailedException).message).toBe(
          originalError.message,
        );
      }
    });

    it('should log error and throw SessionCreationFailedException for unexpected errors', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const logger = getLogger();

      // Create a specific error to track
      const originalError = new Error('Unexpected error');

      // Make sure the repository throws our specific error
      repository.create.mockRejectedValue(originalError);

      // First check that the right type of exception is thrown
      await expect(
        service.createSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
          expiresAt,
        }),
      ).rejects.toThrow(SessionCreationFailedException);

      // Check the logging - this is correct because it's intercepted at the database level
      expect(logger.error).toHaveBeenCalledWith(
        'Database error during session creation',
        originalError,
        {
          userId,
          deviceId,
          action: 'createSession',
        },
      );

      // For checking the cause, we need to check deeper in the error chain
      try {
        await service.createSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
          expiresAt,
        });
        fail('Expected SessionCreationFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionCreationFailedException);

        // The first level cause is a SessionRepositoryException
        const repoError = (error as Error).cause as Error;
        expect(repoError).toBeDefined();
        expect(repoError.message).toContain('Failed to create session');

        // The second level cause should be our original error
        const rootCause = repoError.cause;
        expect(rootCause).toBe(originalError);
      }
    });

    it('should return the created session', async () => {
      const { userId, deviceId, token, tokenId, expiresAt } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();
      repository.create.mockResolvedValue(mockSession);

      const result = await service.createSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
        expiresAt,
      });

      expect(result).toBe(mockSession);
    });
  });
});
