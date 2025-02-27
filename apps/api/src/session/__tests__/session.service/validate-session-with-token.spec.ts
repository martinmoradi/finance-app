import {
  InvalidRefreshTokenException,
  SessionExpiredException,
  SessionNotFoundException,
  SessionRepositoryException,
  SessionRepositoryOperation,
  SessionValidationException,
} from '@/session/exceptions';
import { verify } from 'argon2';
import { setupSessionTests } from './session.service.helper';
import { createMockSession } from '@/session/__tests__/session.fixtures';

// Mock argon2
jest.mock('argon2', () => ({
  verify: jest.fn(),
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
    createExpiredSession,
  } = setupSessionTests();

  describe('validateSessionWithToken', () => {
    it('should call findSessionOrThrow with correct parameters', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(true);

      await service.validateSessionWithToken(userId, deviceId, token);

      expect(repository.findOne).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should call validateSessionExpiration with the found session', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      // Create a valid, non-expired session
      const validSession = createMockSession({
        userId,
        deviceId,
        expiresAt: new Date(Date.now() + 10000), // Future date
      });

      repository.findOne.mockResolvedValue(validSession);
      (verify as jest.Mock).mockResolvedValue(true);

      await service.validateSessionWithToken(userId, deviceId, token);

      // This test is indirect - we verify that if session is valid, no exception is thrown
      // We'll test the negative case in a separate test
    });

    it('should verify the refresh token against the stored token', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(true);

      await service.validateSessionWithToken(userId, deviceId, token);

      expect(verify).toHaveBeenCalledWith(mockSession.token, token);
    });

    it('should throw InvalidtokenException when token verification fails', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateSessionWithToken(userId, deviceId, token),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const cause = (error as SessionValidationException).cause;
        expect(cause).toBeInstanceOf(InvalidRefreshTokenException);
      }
    });

    it('should log debug message when starting the operation', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const logger = getLogger();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(true);

      await service.validateSessionWithToken(userId, deviceId, token);

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting session validation with token',
        {
          userId,
          deviceId,
          action: 'validateSessionWithToken',
        },
      );
    });

    it('should log warning when refresh token is invalid', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const logger = getLogger();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(false);

      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(logger.warn).toHaveBeenCalledWith('Invalid refresh token', {
          userId,
          deviceId,
          action: 'validateSessionWithToken',
        });
      }
    });

    it('should log info message when session is validated successfully', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const logger = getLogger();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(true);

      await service.validateSessionWithToken(userId, deviceId, token);

      expect(logger.info).toHaveBeenCalledWith(
        'Session validated successfully',
        {
          userId,
          deviceId,
          action: 'validateSessionWithToken',
        },
      );
    });

    it('should rethrow SessionRepositoryException wrapped in SessionValidationException', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.FIND,
        userId,
        deviceId,
      );

      repository.findOne.mockRejectedValue(originalError);

      await expect(
        service.validateSessionWithToken(userId, deviceId, token),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        expect((error as SessionValidationException).cause).toStrictEqual(
          originalError,
        );
      }
    });

    it('should rethrow SessionNotFoundException wrapped in SessionValidationException', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const originalError = new SessionNotFoundException();

      repository.findOne.mockResolvedValue(null);

      await expect(
        service.validateSessionWithToken(userId, deviceId, token),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const cause = (error as SessionValidationException).cause;
        expect(cause).toBeInstanceOf(SessionNotFoundException);
      }
    });

    it('should rethrow SessionExpiredException wrapped in SessionValidationException', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      // Create an expired session
      const expiredSession = createExpiredSession();

      repository.findOne.mockResolvedValue(expiredSession);

      await expect(
        service.validateSessionWithToken(userId, deviceId, token),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const cause = (error as SessionValidationException).cause;
        expect(cause).toBeInstanceOf(SessionExpiredException);
      }
    });

    it('should rethrow InvalidtokenException wrapped in SessionValidationException', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateSessionWithToken(userId, deviceId, token),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const cause = (error as SessionValidationException).cause;
        expect(cause).toBeInstanceOf(InvalidRefreshTokenException);
      }
    });

    it('should rethrow existing SessionValidationException without wrapping', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const originalError = new SessionValidationException(
        new Error('Original error'),
      );

      repository.findOne.mockRejectedValue(originalError);

      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        expect((error as SessionValidationException).message).toBe(
          originalError.message,
        );
      }
    });

    it('should log error and throw SessionValidationException for unexpected errors', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const logger = getLogger();

      // Create a specific error to track
      const originalError = new Error('Unexpected error');

      // Bypass the repository layer by directly mocking the private findSessionOrThrow method
      jest
        .spyOn(service as any, 'findSessionOrThrow')
        .mockRejectedValue(originalError);

      // First check that the right type of exception is thrown
      await expect(
        service.validateSessionWithToken(userId, deviceId, token),
      ).rejects.toThrow(SessionValidationException);

      // Check the logging - this should now happen at the validateSessionWithToken level
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error during session validation',
        originalError,
        {
          userId,
          deviceId,
          action: 'validateSessionWithToken',
        },
      );

      // Check the cause chain
      try {
        await service.validateSessionWithToken(userId, deviceId, token);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);

        // The direct cause should be our original error
        const cause = (error as Error).cause;
        expect(cause).toBe(originalError);
      }
    });

    it('should return the validated session when successful', async () => {
      const { userId, deviceId, token } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);
      (verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateSessionWithToken(
        userId,
        deviceId,
        token,
      );

      expect(result).toBe(mockSession);
    });
  });
});
