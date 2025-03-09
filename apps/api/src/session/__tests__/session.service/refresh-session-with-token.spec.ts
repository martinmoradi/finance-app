import {
  SessionRefreshFailedException,
  SessionRepositoryException,
  SessionRepositoryOperation,
  SessionValidationException,
} from '@/session/exceptions';
import { setupSessionTests } from '@/session/__tests__/session.service/session.service.helper';

describe('SessionService', () => {
  const {
    getService,
    getRepository,
    getLogger,
    getMockSession,
    mockSessionData,
  } = setupSessionTests();

  describe('refreshSessionWithToken', () => {
    it('should call findSessionOrThrow with correct parameters', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);

      await service.refreshSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
      });

      expect(repository.findOne).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should call updateSession with updated lastUsedAt and token', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);

      jest.useFakeTimers();
      const currentDate = new Date('2025-01-01');
      jest.setSystemTime(currentDate);

      await service.refreshSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
      });

      // Check that update was called with correct parameters
      expect(repository.update).toHaveBeenCalledWith({
        ...mockSession,
        lastUsedAt: currentDate,
        token,
        tokenId,
      });

      jest.useRealTimers();
    });

    it('should log debug message when starting the operation', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSession = getMockSession();
      const repository = getRepository();

      repository.findOne.mockResolvedValue(mockSession);

      await service.refreshSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting session refresh with token',
        {
          userId,
          deviceId,
          action: 'refreshSessionWithToken',
        },
      );
    });

    it('should log info message when session is refreshed successfully', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSession = getMockSession();
      const repository = getRepository();

      repository.findOne.mockResolvedValue(mockSession);

      await service.refreshSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Session refreshed successfully',
        {
          userId,
          deviceId,
          action: 'refreshSessionWithToken',
        },
      );
    });

    it('should rethrow SessionRepositoryException wrapped in SessionRefreshFailedException', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.findOne.mockResolvedValue(mockSession);

      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.UPDATE,
        userId,
        deviceId,
      );
      repository.update.mockRejectedValue(originalError);

      await expect(
        service.refreshSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
        }),
      ).rejects.toThrow(SessionRefreshFailedException);

      try {
        await service.refreshSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
        });
        fail('Expected SessionRefreshFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionRefreshFailedException);
        expect((error as SessionRefreshFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should rethrow SessionValidationException wrapped in SessionRefreshFailedException', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();

      // Directly mock the findSessionOrThrow method to throw a SessionValidationException
      const originalError = new SessionValidationException(
        new Error('Validation error'),
      );

      jest
        .spyOn(service as any, 'findSessionOrThrow')
        .mockRejectedValue(originalError);

      await expect(
        service.refreshSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
        }),
      ).rejects.toThrow(SessionRefreshFailedException);

      try {
        await service.refreshSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
        });
        fail('Expected SessionRefreshFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionRefreshFailedException);
        expect((error as SessionRefreshFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should rethrow existing SessionRefreshFailedException without wrapping', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      const originalError = new SessionRefreshFailedException(
        new Error('Original error'),
      );
      repository.findOne.mockRejectedValue(originalError);

      try {
        await service.refreshSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
        });
        fail('Expected SessionRefreshFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionRefreshFailedException);
        expect((error as SessionRefreshFailedException).message).toBe(
          originalError.message,
        );
      }
    });

    it('should log error and throw SessionRefreshFailedException for unexpected errors', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const logger = getLogger();

      // Create a specific error to track
      const originalError = new Error('Unexpected error');

      // Bypass the repository layer by directly mocking the private findSessionOrThrow method
      jest
        .spyOn(service as any, 'findSessionOrThrow')
        .mockRejectedValue(originalError);

      await expect(
        service.refreshSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
        }),
      ).rejects.toThrow(SessionRefreshFailedException);

      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error during session refresh',
        originalError,
        {
          userId,
          deviceId,
          action: 'refreshSessionWithToken',
        },
      );

      try {
        await service.refreshSessionWithToken({
          userId,
          deviceId,
          token,
          tokenId,
        });
        fail('Expected SessionRefreshFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionRefreshFailedException);
        const cause = (error as SessionRefreshFailedException).cause;
        expect(cause).toBe(originalError);
      }
    });

    it('should return the updated session', async () => {
      const { userId, deviceId, token, tokenId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();
      const updatedSession = { ...mockSession, token: token };

      repository.findOne.mockResolvedValue(mockSession);
      repository.update.mockResolvedValue(updatedSession);

      const result = await service.refreshSessionWithToken({
        userId,
        deviceId,
        token,
        tokenId,
      });

      expect(result).toBe(updatedSession);
    });
  });
});
