import { LoggerService } from '@/logger/logger.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  UserNotFoundException,
  UserRepositoryException,
} from '@/user/exceptions';
import { UserRepository } from '@/user/user.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseUser } from '@repo/types';
import { UserService } from '../user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockUser: DatabaseUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'Password123!',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createUserDto: CreateUserDto = {
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);
    loggerService = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toMatchObject<DatabaseUser>({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        password: mockUser.password,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      expect(userRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(userRepository.findByEmail).toHaveBeenLastCalledWith(
        mockUser.email,
      );
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Database connection failed');
      userRepository.findByEmail.mockRejectedValue(error);

      await expect(service.findByEmail(mockUser.email)).rejects.toThrow(
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
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toMatchObject<DatabaseUser>({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        password: mockUser.password,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      expect(userRepository.findById).toHaveBeenCalledTimes(1);
      expect(userRepository.findById).toHaveBeenLastCalledWith(mockUser.id);
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Database connection failed');
      userRepository.findById.mockRejectedValue(error);

      await expect(service.findById(mockUser.id)).rejects.toThrow(
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
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findByIdOrThrow(mockUser.id);

      expect(result).toMatchObject<DatabaseUser>({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        password: mockUser.password,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw UserNotFoundException when user not found', async () => {
      await expect(service.findByIdOrThrow('non-existent-id')).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('should throw UserRepositoryException when repository error occurs', async () => {
      const error = new Error('Database error');
      userRepository.findById.mockRejectedValue(error);

      await expect(service.findByIdOrThrow(mockUser.id)).rejects.toThrow(
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
      userRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toMatchObject<DatabaseUser>({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        password: mockUser.password,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw UserRepositoryException when creation returns null', async () => {
      userRepository.create.mockResolvedValue(null);

      await expect(service.create(createUserDto)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Database operation succeeded but returned null',
        { userEmail: createUserDto.email },
      );
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Unique constraint violation');
      userRepository.create.mockRejectedValue(error);

      await expect(service.create(createUserDto)).rejects.toThrow(
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
      userRepository.delete.mockResolvedValue();
      await service.delete(mockUser.id);

      expect(userRepository.delete).toHaveBeenCalledTimes(1);
      expect(userRepository.delete).toHaveBeenLastCalledWith(mockUser.id);
    });

    it('should throw UserRepositoryException on database error', async () => {
      const error = new Error('Foreign key constraint violation');
      userRepository.delete.mockRejectedValue(error);

      await expect(service.delete(mockUser.id)).rejects.toThrow(
        UserRepositoryException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error deleting user by ID',
        error,
      );
    });
  });
});
