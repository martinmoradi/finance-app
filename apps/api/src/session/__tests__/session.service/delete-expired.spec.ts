import { setupSessionTests } from '@/session/__tests__/session.service/session.service.helper';
import {
  SessionCleanupFailedException,
  SessionRepositoryException,
  SessionRepositoryOperation,
} from '@/session/exceptions';

describe('SessionService', () => {
  const { getService, getRepository, getLogger } = setupSessionTests();

  describe('deleteExpired', () => {
    it('should call sessionRepository.deleteExpired', async () => {
      const service = getService();
      const repository = getRepository();

      await service.deleteExpired();

      expect(repository.deleteExpired).toHaveBeenCalled();
    });

    it('should log debug message when starting the operation', async () => {
      const service = getService();
      const logger = getLogger();

      await service.deleteExpired();

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting expired sessions cleanup',
        {
          action: 'deleteExpired',
        },
      );
    });

    it('should log info message when expired sessions are cleaned up successfully', async () => {
      const service = getService();
      const logger = getLogger();

      await service.deleteExpired();

      expect(logger.info).toHaveBeenCalledWith(
        'Expired sessions cleanup completed',
        {
          action: 'deleteExpired',
        },
      );
    });

    it('should rethrow SessionRepositoryException wrapped in SessionCleanupFailedException', async () => {
      const service = getService();
      const repository = getRepository();

      // Create with a valid userId since it's required by the constructor
      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.DELETE_ALL,
        'system', // Using 'system' as a placeholder userId for a global operation
        undefined,
      );

      repository.deleteExpired.mockRejectedValue(originalError);

      await expect(service.deleteExpired()).rejects.toThrow(
        SessionCleanupFailedException,
      );

      try {
        await service.deleteExpired();
        fail('Expected SessionCleanupFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionCleanupFailedException);
        expect((error as SessionCleanupFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should rethrow existing SessionCleanupFailedException without wrapping', async () => {
      const service = getService();
      const repository = getRepository();
      const originalError = new SessionCleanupFailedException(
        new Error('Original error'),
      );

      repository.deleteExpired.mockRejectedValue(originalError);

      try {
        await service.deleteExpired();
        fail('Expected SessionCleanupFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionCleanupFailedException);
        expect((error as SessionCleanupFailedException).message).toBe(
          originalError.message,
        );
      }
    });

    it('should log error and wrap other errors in SessionCleanupFailedException', async () => {
      const service = getService();
      const repository = getRepository();
      const logger = getLogger();
      const originalError = new Error('Unexpected error');

      repository.deleteExpired.mockRejectedValue(originalError);

      await expect(service.deleteExpired()).rejects.toThrow(
        SessionCleanupFailedException,
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cleanup expired sessions',
        originalError,
        {
          action: 'deleteExpired',
        },
      );

      try {
        await service.deleteExpired();
        fail('Expected SessionCleanupFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionCleanupFailedException);
        const cause = (error as Error).cause;
        expect(cause).toBe(originalError);
      }
    });
  });
});
