import { AuthService } from '@/auth/auth.service';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { LoggerService } from '@/logger/logger.service';
import { SessionService } from '@/session/session.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserService } from '@/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseUser, PublicUser } from '@repo/types';

// Mock Argon2
jest.mock('argon2', () => ({
  hash: jest
    .fn()
    .mockImplementation((pass) => Promise.resolve(`hashed_${pass}`)),
  verify: jest
    .fn()
    .mockImplementation((hashed, plain) =>
      Promise.resolve(hashed === `hashed_${plain}`),
    ),
}));

export interface TestContext {
  module: TestingModule;
  authService: AuthService;
  userService: jest.Mocked<UserService>;
  sessionService: jest.Mocked<SessionService>;
  jwtService: jest.Mocked<JwtService>;
  loggerService: jest.Mocked<LoggerService>;
}

// Test data
export const mockUserDto: CreateUserDto = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
};

export const mockDatabaseUser: DatabaseUser = {
  id: 'user123',
  email: mockUserDto.email,
  password: 'hashed_password123',
  name: mockUserDto.name,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockPublicUser: PublicUser = {
  id: mockDatabaseUser.id,
  email: mockDatabaseUser.email,
  name: mockDatabaseUser.name,
};

export const mockDeviceIds = {
  valid: '123e4567-e89b-4d3c-8456-426614174000',
  validAlt: '987fcdeb-a654-4d3c-b987-426614174999',
  invalidFormat: 'not-a-valid-device-id',
  invalidVersion: '123e4567-e89b-1d3c-8456-426614174000', // wrong version number
} as const;

export const mockDatabaseSession = {
  userId: 'user123',
  deviceId: mockDeviceIds.valid,
  token: 'mockToken',
  tokenId: 'mock-token-id',
  createdAt: new Date(),
  lastUsedAt: new Date(),
  expiresAt: new Date(Date.now() + 100000),
};

export const setupTestModule = async (): Promise<TestContext> => {
  // Create complete mock implementations
  const mockUserService = {
    findByEmail: jest.fn().mockResolvedValue(null),
    findByEmailOrThrow: jest.fn().mockResolvedValue(mockDatabaseUser),
    findById: jest.fn().mockResolvedValue(mockDatabaseUser),
    findByIdOrThrow: jest.fn().mockResolvedValue(mockDatabaseUser),
    create: jest.fn().mockResolvedValue(mockDatabaseUser),
    delete: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<UserService>;

  const mockSessionService = {
    createSessionWithToken: jest.fn().mockResolvedValue(mockDatabaseSession),
    refreshSessionWithToken: jest.fn().mockResolvedValue(mockDatabaseSession),
    getValidSession: jest.fn().mockResolvedValue(mockDatabaseSession),
    deleteSession: jest.fn().mockResolvedValue(undefined),
    validateSessionWithToken: jest.fn().mockResolvedValue(undefined),
    verifySession: jest.fn().mockResolvedValue(undefined),
    removeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SessionService>;

  const mockLoggerService = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn().mockReturnThis(),
    forContext: jest.fn().mockReturnThis(),
    isDev: true,
  } as unknown as jest.Mocked<LoggerService>;

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mockToken'),
    sign: jest.fn().mockReturnValue('mockToken'),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn().mockReturnValue({
      sub: mockDatabaseUser.id,
      jti: 'mock-token-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }),
    options: {},
    logger: console,
    mergeJwtOptions: jest.fn(),
    overrideSecretFromOptions: jest.fn(),
    getSecretKey: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  // Create testing module
  const module = await Test.createTestingModule({
    providers: [
      AuthService,
      {
        provide: UserService,
        useValue: mockUserService,
      },
      {
        provide: SessionService,
        useValue: mockSessionService,
      },
      {
        provide: LoggerService,
        useValue: mockLoggerService,
      },
      {
        provide: JwtService,
        useValue: mockJwtService,
      },
      {
        provide: refreshJwtConfig.KEY,
        useValue: {
          expiresIn: '7d',
          secret: 'testSecret',
        },
      },
    ],
  }).compile();

  // Get service instances
  const authService = module.get<AuthService>(AuthService);
  const userService = mockUserService;
  const sessionService = mockSessionService;
  const jwtService = mockJwtService;
  const loggerService = mockLoggerService;

  return {
    module,
    authService,
    userService,
    sessionService,
    jwtService,
    loggerService,
  };
};
