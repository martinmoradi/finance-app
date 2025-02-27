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

  describe('findByEmailOrThrow', () => {
    const testEmail = mockDatabaseUser.email;

    it('should call findByEmail with correct email', async () => {
      // We need to spy on findByEmail since findByEmailOrThrow calls it
      jest
        .spyOn(userService, 'findByEmail')
        .mockResolvedValue(mockDatabaseUser);

      await userService.findByEmailOrThrow(testEmail);

      expect(userService.findByEmail).toHaveBeenCalledWith(testEmail);
    });

    it('should return user when found', async () => {
      jest
        .spyOn(userService, 'findByEmail')
        .mockResolvedValue(mockDatabaseUser);

      const result = await userService.findByEmailOrThrow(testEmail);

      expect(result).toBe(mockDatabaseUser);
    });

    it('should throw UserNotFoundException when user not found', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      await expect(userService.findByEmailOrThrow(testEmail)).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('should log debug message when starting the operation', async () => {
      jest
        .spyOn(userService, 'findByEmail')
        .mockResolvedValue(mockDatabaseUser);

      await userService.findByEmailOrThrow(testEmail);

      expect(loggerService.debug).toHaveBeenCalledWith(
        'Starting database user find by email',
        {
          email: testEmail,
          action: 'findByEmailOrThrow',
        },
      );
    });

    it('should log warning when user not found', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      try {
        await userService.findByEmailOrThrow(testEmail);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.warn).toHaveBeenCalledWith(
        'User not found by email',
        {
          email: testEmail,
          action: 'findByEmailOrThrow',
        },
      );
    });

    it('should rethrow UserRepositoryException from findByEmail', async () => {
      const originalError = new UserRepositoryException(
        UserRepositoryOperation.FIND,
        testEmail,
      );
      jest.spyOn(userService, 'findByEmail').mockRejectedValue(originalError);

      await expect(
        userService.findByEmailOrThrow(testEmail),
      ).rejects.toStrictEqual(originalError);
    });

    it('should not log error when UserNotFoundException is thrown', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      try {
        await userService.findByEmailOrThrow(testEmail);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it('should log error for other exceptions', async () => {
      const originalError = new Error('Database connection failed');
      jest.spyOn(userService, 'findByEmail').mockRejectedValue(originalError);

      try {
        await userService.findByEmailOrThrow(testEmail);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during user find',
        originalError,
        {
          email: testEmail,
          action: 'findByEmailOrThrow',
        },
      );
    });

    it('should wrap non-UserNotFoundException errors in UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      jest.spyOn(userService, 'findByEmail').mockRejectedValue(originalError);

      try {
        await userService.findByEmailOrThrow(testEmail);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).operation).toBe(
          UserRepositoryOperation.FIND,
        );
        expect((error as UserRepositoryException).identifier).toBe(testEmail);
        expect((error as UserRepositoryException).cause).toBe(originalError);
      }
    });
  });
});
