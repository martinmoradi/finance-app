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
    jest.clearAllMocks();
  });

  describe('delete', () => {
    it('should call userRepository.delete with correct id', async () => {
      userRepository.delete.mockResolvedValue(undefined);

      await userService.delete(mockDatabaseUser.id);

      expect(userRepository.delete).toHaveBeenCalledWith(mockDatabaseUser.id);
    });

    it('should return void when deletion is successful', async () => {
      userRepository.delete.mockResolvedValue(undefined);

      const result = await userService.delete(mockDatabaseUser.id);

      expect(result).toBeUndefined();
    });

    it('should log debug message when starting the operation', async () => {
      userRepository.delete.mockResolvedValue(undefined);

      await userService.delete(mockDatabaseUser.id);

      expect(loggerService.debug).toHaveBeenCalledWith(
        'Starting database user deletion',
        {
          userId: mockDatabaseUser.id,
          action: 'delete',
        },
      );
    });

    it('should log error when repository throws an error', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.delete.mockRejectedValue(originalError);

      try {
        await userService.delete(mockDatabaseUser.id);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during user deletion',
        originalError,
        {
          userId: mockDatabaseUser.id,
          action: 'delete',
        },
      );
    });

    it('should wrap repository errors in UserRepositoryException with correct operation', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.delete.mockRejectedValue(originalError);

      try {
        await userService.delete(mockDatabaseUser.id);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).operation).toBe(
          UserRepositoryOperation.DELETE,
        );
      }
    });

    it('should include the userId in thrown UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.delete.mockRejectedValue(originalError);

      try {
        await userService.delete(mockDatabaseUser.id);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).identifier).toBe(
          mockDatabaseUser.id,
        );
      }
    });

    it('should include original error in thrown UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.delete.mockRejectedValue(originalError);

      try {
        await userService.delete(mockDatabaseUser.id);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).cause).toBe(originalError);
      }
    });
  });
});
