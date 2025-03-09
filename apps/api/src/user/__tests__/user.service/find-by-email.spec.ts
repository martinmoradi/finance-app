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
import { DatabaseUser } from '@repo/types';

describe('UserService', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let userService: UserService;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    ({ userRepository, userService, loggerService } = await setupTestModule());
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should call userRepository.findByEmail with correct email', async () => {
      await userService.findByEmail(mockDatabaseUser.email);

      expect(userRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        mockDatabaseUser.email,
      );
    });

    it('should return user when found in repository', async () => {
      userRepository.findByEmail.mockResolvedValueOnce(mockDatabaseUser);

      const result = await userService.findByEmail(mockDatabaseUser.email);

      expect(result).toEqual(mockDatabaseUser);
    });

    it('should return null when user not found in repository', async () => {
      userRepository.findByEmail.mockResolvedValueOnce(null);

      const result = await userService.findByEmail(mockDatabaseUser.email);

      expect(result).toBeNull();
    });

    it('should log debug message when starting the operation', async () => {
      await userService.findByEmail(mockDatabaseUser.email);

      expect(loggerService.debug).toHaveBeenCalledTimes(1);
      expect(loggerService.debug).toHaveBeenCalledWith(
        'Starting database user find by email',
        {
          email: mockDatabaseUser.email,
          action: 'findByEmail',
        },
      );
    });

    it('should log error when repository throws an error', async () => {
      const testError = new Error('Database connection error');
      userRepository.findByEmail.mockRejectedValueOnce(testError);

      await expect(
        userService.findByEmail(mockDatabaseUser.email),
      ).rejects.toThrow();

      expect(loggerService.error).toHaveBeenCalledTimes(1);
      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during user find',
        testError,
        {
          email: mockDatabaseUser.email,
          action: 'findByEmail',
        },
      );
    });

    it('should wrap repository errors in UserRepositoryException with correct operation', async () => {
      const testError = new Error('Database connection error');
      userRepository.findByEmail.mockRejectedValueOnce(testError);

      try {
        await userService.findByEmail(mockDatabaseUser.email);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).operation).toBe(
          UserRepositoryOperation.FIND,
        );
      }
    });
    it('should include the email in thrown UserRepositoryException', async () => {
      const testError = new Error('Database connection error');
      userRepository.findByEmail.mockRejectedValueOnce(testError);

      await expect(
        userService.findByEmail(mockDatabaseUser.email),
      ).rejects.toMatchObject({
        identifier: mockDatabaseUser.email,
      });
    });

    it('should include original error in thrown UserRepositoryException', async () => {
      const testError = new Error('Database connection error');
      userRepository.findByEmail.mockRejectedValueOnce(testError);

      try {
        await userService.findByEmail(mockDatabaseUser.email);
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).cause).toBe(testError);
      }
    });
  });
});
