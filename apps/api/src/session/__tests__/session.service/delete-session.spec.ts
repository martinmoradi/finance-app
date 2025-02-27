import { setupSessionTests } from '@/session/__tests__/session.service/session.service.helper';
import {
  SessionRepositoryException,
  SessionRepositoryOperation,
} from '@/session/exceptions';

describe('SessionService', () => {
  const {
    getService,
    getRepository,
    getLogger,
    getMockSession,
    mockSessionData,
  } = setupSessionTests();

  describe('deleteSession', () => {
    it('should call sessionRepository.delete with correct parameters', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.delete.mockResolvedValue(mockSession);

      await service.deleteSession(userId, deviceId);

      expect(repository.delete).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should throw SessionRepositoryException when repository returns null', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      repository.delete.mockResolvedValue(null);

      await expect(service.deleteSession(userId, deviceId)).rejects.toThrow(
        SessionRepositoryException,
      );

      try {
        await service.deleteSession(userId, deviceId);
        fail('Expected SessionRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionRepositoryException);
        expect((error as SessionRepositoryException).operation).toBe(
          SessionRepositoryOperation.DELETE,
        );
        expect((error as SessionRepositoryException).userId).toBe(userId);
        expect((error as SessionRepositoryException).deviceId).toBe(deviceId);
      }
    });

    it('should log debug message when starting the operation', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSession = getMockSession();
      const repository = getRepository();

      repository.delete.mockResolvedValue(mockSession);

      await service.deleteSession(userId, deviceId);

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting database session deletion',
        {
          userId,
          deviceId,
          action: 'deleteSession',
        },
      );
    });

    it('should log info message when session is deleted successfully', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSession = getMockSession();
      const repository = getRepository();

      repository.delete.mockResolvedValue(mockSession);

      await service.deleteSession(userId, deviceId);

      expect(logger.info).toHaveBeenCalledWith('Session deleted successfully', {
        userId,
        deviceId,
        action: 'deleteSession',
      });
    });

    it('should rethrow existing SessionRepositoryException', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.DELETE,
        userId,
        deviceId,
      );

      repository.delete.mockRejectedValue(originalError);

      try {
        await service.deleteSession(userId, deviceId);
        fail('Expected SessionRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });

    it('should log error and wrap other errors in SessionRepositoryException', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const logger = getLogger();

      const originalError = new Error('Unexpected error');
      repository.delete.mockRejectedValue(originalError);

      await expect(service.deleteSession(userId, deviceId)).rejects.toThrow(
        SessionRepositoryException,
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Database error during session delete',
        originalError,
        {
          userId,
          deviceId,
          action: 'deleteSession',
        },
      );

      try {
        await service.deleteSession(userId, deviceId);
        fail('Expected SessionRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionRepositoryException);
        expect((error as SessionRepositoryException).operation).toBe(
          SessionRepositoryOperation.DELETE,
        );
        expect((error as SessionRepositoryException).userId).toBe(userId);
        expect((error as SessionRepositoryException).deviceId).toBe(deviceId);
        expect((error as Error).cause).toBe(originalError);
      }
    });

    it('should return the deleted session when successful', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSession = getMockSession();

      repository.delete.mockResolvedValue(mockSession);

      const result = await service.deleteSession(userId, deviceId);

      expect(result).toBe(mockSession);
    });
  });
});
