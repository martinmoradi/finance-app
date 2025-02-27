import {
  SessionRepositoryException,
  SessionRepositoryOperation,
} from '@/session/exceptions';
import { setupSessionTests } from '@/session/__tests__/session.service/session.service.helper';
import { createMockSession } from '@/session/__tests__/session.fixtures';

describe('SessionService', () => {
  const {
    getService,
    getRepository,
    getLogger,
    mockSessionData,
    createMultipleSessions,
  } = setupSessionTests();

  describe('removeAllSessionsForUser', () => {
    it('should call sessionRepository.deleteAllForUser with correct userId', async () => {
      const { userId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSessions = createMultipleSessions(3);

      repository.deleteAllForUser.mockResolvedValue(mockSessions);

      await service.removeAllSessionsForUser(userId);

      expect(repository.deleteAllForUser).toHaveBeenCalledWith(userId);
    });

    it('should log debug message when starting the operation', async () => {
      const { userId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSessions = createMultipleSessions(3);
      const repository = getRepository();

      repository.deleteAllForUser.mockResolvedValue(mockSessions);

      await service.removeAllSessionsForUser(userId);

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting session removal for user',
        {
          userId,
          action: 'removeAllSessionsForUser',
        },
      );
    });

    it('should log info message when all sessions are removed successfully', async () => {
      const { userId } = mockSessionData;
      const service = getService();
      const logger = getLogger();
      const mockSessions = createMultipleSessions(3);
      const repository = getRepository();

      repository.deleteAllForUser.mockResolvedValue(mockSessions);

      await service.removeAllSessionsForUser(userId);

      expect(logger.info).toHaveBeenCalledWith(
        'Successfully removed all sessions for user',
        {
          userId,
          action: 'removeAllSessionsForUser',
        },
      );
    });

    it('should rethrow existing SessionRepositoryException', async () => {
      const { userId } = mockSessionData;
      const service = getService();
      const repository = getRepository();

      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.DELETE_ALL,
        userId,
      );

      repository.deleteAllForUser.mockRejectedValue(originalError);

      try {
        await service.removeAllSessionsForUser(userId);
        fail('Expected SessionRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });

    it('should log error and wrap other errors in SessionRepositoryException', async () => {
      const { userId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const logger = getLogger();

      const originalError = new Error('Unexpected error');
      repository.deleteAllForUser.mockRejectedValue(originalError);

      await expect(service.removeAllSessionsForUser(userId)).rejects.toThrow(
        SessionRepositoryException,
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to remove all sessions for user',
        originalError,
        {
          userId,
          action: 'removeAllSessionsForUser',
        },
      );

      try {
        await service.removeAllSessionsForUser(userId);
        fail('Expected SessionRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionRepositoryException);
        expect((error as SessionRepositoryException).operation).toBe(
          SessionRepositoryOperation.DELETE_ALL,
        );
        expect((error as SessionRepositoryException).userId).toBe(userId);
        expect((error as Error).cause).toBe(originalError);
      }
    });

    it('should return the deleted sessions when successful', async () => {
      const { userId } = mockSessionData;
      const service = getService();
      const repository = getRepository();
      const mockSessions = createMultipleSessions(3);

      repository.deleteAllForUser.mockResolvedValue(mockSessions);

      const result = await service.removeAllSessionsForUser(userId);

      expect(result).toBe(mockSessions);
      expect(result.length).toBe(mockSessions.length);
    });
  });
});
