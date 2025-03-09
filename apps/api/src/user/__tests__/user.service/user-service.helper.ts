import { LoggerService } from '@/logger/logger.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseUser } from '@repo/types';

export interface TestContext {
  module: TestingModule;
  userService: UserService;
  userRepository: jest.Mocked<UserRepository>;
  loggerService: jest.Mocked<LoggerService>;
}

// Test data
export const mockCreateUserDto: CreateUserDto = {
  email: 'test@example.com',
  password: 'Password123!',
  name: 'Test User',
};

export const mockDatabaseUser: DatabaseUser = {
  id: 'user-123',
  email: mockCreateUserDto.email,
  name: mockCreateUserDto.name,
  password: mockCreateUserDto.password,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const setupTestModule = async (): Promise<TestContext> => {
  // Create mock implementations
  const mockUserRepository = {
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(mockDatabaseUser),
    create: jest.fn().mockResolvedValue(mockDatabaseUser),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<UserRepository>;

  const mockLoggerService = {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    setContext: jest.fn().mockReturnThis(),
    forContext: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<LoggerService>;

  // Create testing module
  const module = await Test.createTestingModule({
    providers: [
      UserService,
      {
        provide: UserRepository,
        useValue: mockUserRepository,
      },
      {
        provide: LoggerService,
        useValue: mockLoggerService,
      },
    ],
  }).compile();

  // Get service instances
  const userService = module.get<UserService>(UserService);
  const userRepository = mockUserRepository;
  const loggerService = mockLoggerService;

  return {
    module,
    userService,
    userRepository,
    loggerService,
  };
};
