import { LoggerService } from '@/logger/logger.service';
import {
  mockDatabaseUser,
  setupTestModule,
} from '@/user/__tests__/user.service/user-service.helper';
import {
  UserRepositoryException,
  UserRepositoryOperation,
} from '@/user/exceptions';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';

describe('UserService', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let userService: UserService;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    ({ userRepository, userService, loggerService } = await setupTestModule());
  });

  describe('findById', () => {
    const testId = mockDatabaseUser.id;

    it('should call userRepository.findById with correct id', async () => {
      userRepository.findById.mockResolvedValue(mockDatabaseUser);

      await userService.findById(testId);

      expect(userRepository.findById).toHaveBeenCalledWith(testId);
    });

    it('should return user when found in repository', async () => {
      userRepository.findById.mockResolvedValue(mockDatabaseUser);

      const result = await userService.findById(testId);

      expect(result).toBe(mockDatabaseUser);
    });

    it('should return null when user not found in repository', async () => {
      userRepository.findById.mockResolvedValue(null);

      const result = await userService.findById(testId);

      expect(result).toBeNull();
    });

    it('should log debug message when starting the operation', async () => {
      userRepository.findById.mockResolvedValue(mockDatabaseUser);

      await userService.findById(testId);

      expect(loggerService.debug).toHaveBeenCalledWith(
        'Starting database user find by ID',
        {
          userId: testId,
          action: 'findById',
        },
      );
    });

    it('should log error when repository throws an error', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.findById.mockRejectedValue(originalError);

      try {
        await userService.findById(testId);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during user find',
        originalError,
        {
          userId: testId,
          action: 'findById',
        },
      );
    });

    it('should wrap repository errors in UserRepositoryException with correct operation', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.findById.mockRejectedValue(originalError);

      try {
        await userService.findById(testId);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).operation).toBe(
          UserRepositoryOperation.FIND,
        );
      }
    });

    it('should include the userId in thrown UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.findById.mockRejectedValue(originalError);

      try {
        await userService.findById(testId);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).identifier).toBe(testId);
      }
    });

    it('should include original error in thrown UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.findById.mockRejectedValue(originalError);

      try {
        await userService.findById(testId);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).cause).toBe(originalError);
      }
    });
  });
});
