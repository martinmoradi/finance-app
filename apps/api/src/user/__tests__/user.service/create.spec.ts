import { LoggerService } from '@/logger/logger.service';
import {
  mockCreateUserDto,
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

  describe('create', () => {
    it('should call userRepository.create with correct dto', async () => {
      userRepository.create.mockResolvedValue(mockDatabaseUser);

      const result = await userService.create(mockCreateUserDto);

      expect(result).toMatchObject<DatabaseUser>({
        id: mockDatabaseUser.id,
        email: mockDatabaseUser.email,
        name: mockDatabaseUser.name,
        password: mockDatabaseUser.password,
        createdAt: mockDatabaseUser.createdAt,
        updatedAt: mockDatabaseUser.updatedAt,
      });

      expect(userRepository.create).toHaveBeenCalledWith(mockCreateUserDto);
    });

    it('should return created user from repository', async () => {
      const expectedUser = { ...mockDatabaseUser };
      userRepository.create.mockResolvedValue(expectedUser);

      const result = await userService.create(mockCreateUserDto);

      expect(result).toBe(expectedUser);
    });

    it('should log debug message when starting the operation', async () => {
      userRepository.create.mockResolvedValue(mockDatabaseUser);

      await userService.create(mockCreateUserDto);

      expect(loggerService.debug).toHaveBeenCalledWith(
        'Starting database user creation',
        {
          email: mockCreateUserDto.email,
          action: 'create',
        },
      );
    });

    it('should throw UserRepositoryException when repository returns null', async () => {
      userRepository.create.mockResolvedValue(null);

      await expect(userService.create(mockCreateUserDto)).rejects.toThrow(
        UserRepositoryException,
      );
    });

    it('should include correct operation and email in thrown UserRepositoryException when repository returns null', async () => {
      userRepository.create.mockResolvedValue(null);

      try {
        await userService.create(mockCreateUserDto);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect((error as UserRepositoryException).operation).toBe(
          UserRepositoryOperation.CREATE,
        );
        expect((error as UserRepositoryException).identifier).toBe(
          mockCreateUserDto.email,
        );
      }
    });

    it('should rethrow UserRepositoryException from repository', async () => {
      const originalError = new UserRepositoryException(
        UserRepositoryOperation.CREATE,
        mockCreateUserDto.email,
      );
      userRepository.create.mockRejectedValue(originalError);

      await expect(userService.create(mockCreateUserDto)).rejects.toBe(
        originalError,
      );
    });

    it('should log error when repository throws non-UserRepositoryException error', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.create.mockRejectedValue(originalError);

      try {
        await userService.create(mockCreateUserDto);
      } catch (error) {
        // Ignore error
      }

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during user creation',
        originalError,
        {
          email: mockCreateUserDto.email,
          action: 'create',
        },
      );
    });

    it('should wrap non-UserRepositoryException errors in UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.create.mockRejectedValue(originalError);
      try {
        await userService.create(mockCreateUserDto);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).identifier).toBe(
          mockCreateUserDto.email,
        );
      }
    });

    it('should include the email in thrown UserRepositoryException', async () => {
      const originalError = new Error('Database connection failed');
      userRepository.create.mockRejectedValue(originalError);
      try {
        await userService.create(mockCreateUserDto);
        fail('Expected UserRepositoryException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserRepositoryException);
        expect((error as UserRepositoryException).cause).toBe(originalError);
      }
    });
  });
});
