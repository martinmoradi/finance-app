import { LoggerService } from '@/logger/logger.service';
import {
  mockDatabaseUser,
  setupTestModule,
} from '@/user/__tests__/user.service/user-service.helper';
import {
  UserNotFoundException,
  UserRepositoryException,
  UserRepositoryOperation,
} from '@/user/exceptions';
import { UserService } from '@/user/user.service';

describe('UserService', () => {
  let userService: UserService;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    ({ userService, loggerService } = await setupTestModule());
    jest.clearAllMocks();
  });

  describe('findByIdOrThrow', () => {
    const testId = mockDatabaseUser.id;

    it('should call findById with correct id', async () => {
      // We need to spy on findById since findByIdOrThrow calls it
      jest.spyOn(userService, 'findById').mockResolvedValue(mockDatabaseUser);

      await userService.findByIdOrThrow(testId);

      expect(userService.findById).toHaveBeenCalledWith(testId);
    });

    it('should return user when found', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(mockDatabaseUser);

      const result = await userService.findByIdOrThrow(testId);

      expect(result).toBe(mockDatabaseUser);
    });

    it('should throw UserNotFoundException when user not found', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(null);

      await expect(userService.findByIdOrThrow(testId)).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('should log debug message when starting the operation', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(mockDatabaseUser);

      await userService.findByIdOrThrow(testId);

      expect(loggerService.debug).toHaveBeenCalledWith(
        'Starting database user find by ID',
        {
          userId: testId,
          action: 'findByIdOrThrow',
        },
      );
    });

    it('should log warning when user not found', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(null);

      try {
        await userService.findByIdOrThrow(testId);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.warn).toHaveBeenCalledWith('User not found by ID', {
        userId: testId,
        action: 'findByIdOrThrow',
      });
    });

    it('should rethrow UserRepositoryException from findById', async () => {
      const originalError = new UserRepositoryException(
        UserRepositoryOperation.FIND,
        testId,
      );
      jest.spyOn(userService, 'findById').mockRejectedValue(originalError);

      await expect(userService.findByIdOrThrow(testId)).rejects.toStrictEqual(
        originalError,
      );
    });

    it('should not log error when UserNotFoundException is thrown', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(null);

      try {
        await userService.findByIdOrThrow(testId);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it('should log error for other exceptions', async () => {
      const originalError = new Error('Database connection failed');
      jest.spyOn(userService, 'findById').mockRejectedValue(originalError);

      try {
        await userService.findByIdOrThrow(testId);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during user find',
        originalError,
        {
          userId: testId,
          action: 'findByIdOrThrow',
        },
      );
    });

    it('should wrap non-UserNotFoundException errors in UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      jest.spyOn(userService, 'findById').mockRejectedValue(originalError);

      try {
        await userService.findByIdOrThrow(testId);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).operation).toBe(
          UserRepositoryOperation.FIND,
        );
        expect((error as UserRepositoryException).identifier).toBe(testId);
        expect((error as UserRepositoryException).cause).toBe(originalError);
      }
    });
  });
});
