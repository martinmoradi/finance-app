import {
  SessionExpiredException,
  SessionNotFoundException,
  SessionRepositoryException,
  SessionRepositoryOperation,
  SessionValidationException,
} from '@/session/exceptions';
import { setupSessionTests } from '@/session/__tests__/session.service/session.service.helper';
import { createMockSession } from '@/session/__tests__/session.fixtures';

describe('SessionService', () => {
  const {
    getService,
    getRepository,
    getLogger,
    getMockSession,
    mockSessionData,
    createExpiredSession,
  } = setupSessionTests();

  describe('getValidSession', () => {
    it('should call findSessionOrThrow with correct parameters', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);

      await service.getValidSession({
        userId,
        deviceId: deviceId,
      });

      expect(repository.findOne).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should call validateSessionExpiration with the found session', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      // Create a valid, non-expired session
      const validSession = createMockSession({
        userId,
        deviceId,
        expiresAt: new Date(Date.now() + 10000), // Future date
      });

      repository.findOne.mockResolvedValue(validSession);

      await service.getValidSession({
        userId,
        deviceId: deviceId,
      });

      // This test is indirect - we verify that if session is valid, no exception is thrown
      // A more direct test would be to spy on the validateSessionExpiration method,
      // but since it's private we test the outcome
    });

    it('should log debug message when starting the operation', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSession = getMockSession();
      const repository = getRepository();

      repository.findOne.mockResolvedValue(mockSession);

      await service.getValidSession({
        userId,
        deviceId: deviceId,
      });

      expect(logger.debug).toHaveBeenCalledWith('Starting session validation', {
        userId,
        deviceId,
        action: 'getValidSession',
      });
    });

    it('should log info message when session is validated successfully', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSession = getMockSession();
      const repository = getRepository();

      repository.findOne.mockResolvedValue(mockSession);

      await service.getValidSession({
        userId,
        deviceId: deviceId,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Session validated successfully',
        {
          userId,
          deviceId,
          action: 'getValidSession',
        },
      );
    });

    it('should rethrow SessionNotFoundException wrapped in SessionValidationException', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      // Repository returns null, which should lead to SessionNotFoundException
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getValidSession({
          userId,
          deviceId: deviceId,
        }),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.getValidSession({
          userId,
          deviceId: deviceId,
        });
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const cause = (error as SessionValidationException).cause;
        expect(cause).toBeInstanceOf(SessionNotFoundException);
      }
    });

    it('should rethrow SessionExpiredException wrapped in SessionValidationException', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      // Create an expired session
      const expiredSession = createExpiredSession();
      repository.findOne.mockResolvedValue(expiredSession);

      await expect(
        service.getValidSession({
          userId,
          deviceId: deviceId,
        }),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.getValidSession({
          userId,
          deviceId: deviceId,
        });
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const cause = (error as SessionValidationException).cause;
        expect(cause).toBeInstanceOf(SessionExpiredException);
      }
    });

    it('should rethrow SessionRepositoryException wrapped in SessionValidationException', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.FIND,
        userId,
        deviceId,
      );

      repository.findOne.mockRejectedValue(originalError);

      await expect(
        service.getValidSession({
          userId,
          deviceId: deviceId,
        }),
      ).rejects.toThrow(SessionValidationException);

      try {
        await service.getValidSession({
          userId,
          deviceId: deviceId,
        });
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        expect((error as SessionValidationException).cause).toStrictEqual(
          originalError,
        );
      }
    });

    it('should rethrow existing SessionValidationException without wrapping', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      const originalError = new SessionValidationException(
        new Error('Original error'),
      );

      repository.findOne.mockRejectedValue(originalError);

      try {
        await service.getValidSession({
          userId,
          deviceId: deviceId,
        });
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        expect((error as SessionValidationException).message).toBe(
          originalError.message,
        );
        // The error should be identical, not a new wrapper
      }
    });

    it('should log error and throw SessionValidationException for unexpected errors', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const logger = getLogger();

      // Create a specific error to track
      const originalError = new Error('Unexpected error');

      // Bypass the repository layer by directly mocking the private findSessionOrThrow method
      jest
        .spyOn(service as any, 'findSessionOrThrow')
        .mockRejectedValue(originalError);

      await expect(
        service.getValidSession({
          userId,
          deviceId: deviceId,
        }),
      ).rejects.toThrow(SessionValidationException);

      expect(logger.error).toHaveBeenCalledWith(
        'Error during session validation',
        originalError,
        {
          userId,
          deviceId,
          action: 'getValidSession',
        },
      );

      try {
        await service.getValidSession({
          userId,
          deviceId: deviceId,
        });
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const cause = (error as SessionValidationException).cause;
        expect(cause).toBe(originalError);
      }
    });

    it('should return the validated session when successful', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);

      const result = await service.getValidSession({
        userId,
        deviceId: deviceId,
      });

      expect(result).toBe(mockSession);
    });
  });
});
