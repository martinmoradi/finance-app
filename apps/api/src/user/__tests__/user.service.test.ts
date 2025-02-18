import { LoggerService } from '@/logger/logger.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  UserNotFoundException,
  UserRepositoryException,
} from '@/user/exceptions';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';
import { DatabaseUser } from '@repo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: UserRepository;
  let loggerService: LoggerService;

  const mockUser: DatabaseUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createUserDto: CreateUserDto = {
    email: 'test@example.com',
    password: 'password',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    userRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    loggerService = {
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    } as unknown as LoggerService;

    userService = new UserService(userRepository, loggerService);
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      const result = await userService.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(userRepository.findByEmail).mockRejectedValue(error);

      await expect(userService.findByEmail(mockUser.email)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error finding user by email',
        error,
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      const result = await userService.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Database timeout');
      vi.mocked(userRepository.findById).mockRejectedValue(error);

      await expect(userService.findById(mockUser.id)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error finding user by ID',
        error,
      );
    });
  });

  describe('findByIdOrThrow', () => {
    it('should return user when exists', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      const result = await userService.findByIdOrThrow(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw UserNotFoundException when user not found', async () => {
      await expect(
        userService.findByIdOrThrow('non-existent-id'),
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should throw UserRepositoryException when repository error occurs', async () => {
      const error = new Error('Database error');
      vi.mocked(userRepository.findById).mockRejectedValue(error);

      await expect(userService.findByIdOrThrow(mockUser.id)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error finding user by ID',
        error,
      );
    });
  });

  describe('create', () => {
    it('should create and return new user', async () => {
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);
      const result = await userService.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw UserRepositoryException when creation returns null', async () => {
      vi.mocked(userRepository.create).mockResolvedValue(null);

      await expect(userService.create(createUserDto)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Database operation succeeded but returned null',
        { userEmail: createUserDto.email },
      );
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Unique constraint violation');
      vi.mocked(userRepository.create).mockRejectedValue(error);

      await expect(userService.create(createUserDto)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error creating user',
        error,
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      await userService.delete(mockUser.id);
      expect(userRepository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Foreign key constraint violation');
      vi.mocked(userRepository.delete).mockRejectedValue(error);

      await expect(userService.delete(mockUser.id)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error deleting user by ID',
        error,
      );
    });
  });
});
