import { AuthService } from '@/auth/auth.service';
import {
  AuthenticationFailedException,
  InvalidCredentialsException,
  SigninFailedException,
  SignoutFailedException,
  SignupFailedException,
  TokenGenerationFailedException,
} from '@/auth/exceptions';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { LoggerService } from '@/logger/logger.service';
import {
  SessionCreationFailedException,
  SessionExpiredException,
  SessionLimitExceededException,
  SessionNotFoundException,
  SessionRepositoryException,
} from '@/session/exceptions';
import { SessionService } from '@/session/session.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
} from '@/user/exceptions';
import { UserService } from '@/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseUser, PublicUser } from '@repo/types';
import { verify } from 'argon2';

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

describe('AuthService', () => {
  let module: TestingModule;
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let sessionService: jest.Mocked<SessionService>;
  let jwtService: jest.Mocked<JwtService>;
  let loggerService: jest.Mocked<LoggerService>;

  // Test data
  const mockUserDto: CreateUserDto = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockDatabaseUser: DatabaseUser = {
    id: 'user123',
    email: mockUserDto.email,
    password: 'hashed_password123',
    name: mockUserDto.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPublicUser: PublicUser = {
    id: mockDatabaseUser.id,
    email: mockDatabaseUser.email,
    name: mockDatabaseUser.name,
  };

  const mockDatabaseSession = {
    userId: 'user123',
    deviceId: 'device123',
    token: 'mockToken',
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockUserService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByIdOrThrow: jest.fn().mockResolvedValue(mockDatabaseUser),
      create: jest.fn().mockResolvedValue(mockDatabaseUser),
      delete: jest.fn().mockResolvedValue(true),
    };

    const mockSessionService = {
      createSessionWithToken: jest.fn().mockResolvedValue(mockDatabaseSession),
      findAndVerifySession: jest.fn().mockResolvedValue(undefined),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      validateSession: jest.fn().mockResolvedValue(undefined),
      verifySession: jest.fn().mockResolvedValue(undefined),
    };

    const mockLoggerService = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mockToken'),
    };

    // Create testing module
    module = await Test.createTestingModule({
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
    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    sessionService = module.get(SessionService);
    jwtService = module.get(JwtService);
    loggerService = module.get(LoggerService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should successfully create a new user and session', async () => {
      // Execute
      const [user, tokens] = await authService.signup(mockUserDto, 'device123');

      // Assertions
      expect(user).toEqual(mockPublicUser);
      expect(tokens).toEqual({
        accessToken: 'mockToken',
        refreshToken: 'mockToken',
      });

      // Verify user creation
      expect(userService.findByEmail).toHaveBeenCalledWith(mockUserDto.email);
      expect(userService.create).toHaveBeenCalledWith({
        ...mockUserDto,
        password: 'hashed_password123',
      });

      // Verify session creation
      expect(sessionService.createSessionWithToken).toHaveBeenCalledWith(
        mockDatabaseUser.id,
        'device123',
        'mockToken',
        expect.any(Date),
      );

      // Verify logging
      expect(loggerService.info).toHaveBeenCalledWith(
        'User signup successful',
        {
          userId: mockDatabaseUser.id,
          email: mockUserDto.email,
          deviceId: 'device123',
        },
      );
    });

    it('should rollback user creation if session creation fails', async () => {
      // Setup failure in session creation
      const sessionError = new SessionCreationFailedException(
        new Error('DB connection failed'),
      );
      sessionService.createSessionWithToken.mockRejectedValue(sessionError);

      // Execute and verify error
      await expect(
        authService.signup(mockUserDto, 'device123'),
      ).rejects.toThrow(SignupFailedException);

      // Verify user deletion attempt
      expect(userService.delete).toHaveBeenCalledWith(mockDatabaseUser.id);
      expect(loggerService.debug).toHaveBeenCalledWith(
        'Rollback: User cleanup successful',
        { userId: mockDatabaseUser.id },
      );
    });

    it('should throw UserAlreadyExistsException if email exists', async () => {
      // Setup existing user
      userService.findByEmail.mockResolvedValue(mockDatabaseUser);

      // Execute and verify error
      await expect(
        authService.signup(mockUserDto, 'device123'),
      ).rejects.toThrow(UserAlreadyExistsException);

      // Verify no user creation attempted
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should handle token generation failures', async () => {
      // Setup JWT failure
      const jwtError = new Error('JWT failure');
      jwtService.signAsync.mockRejectedValue(jwtError);

      // Execute and verify error
      await expect(
        authService.signup(mockUserDto, 'device123'),
      ).rejects.toThrow(TokenGenerationFailedException);

      // Verify error logging
      expect(loggerService.error).toHaveBeenCalledWith(
        'Error during token generation',
        expect.any(TokenGenerationFailedException),
      );
    });

    it('should handle unexpected errors during signup', async () => {
      // Setup unexpected error
      const unexpectedError = new Error('Unexpected DB failure');
      userService.findByEmail.mockRejectedValue(unexpectedError);

      // Execute and verify error
      await expect(
        authService.signup(mockUserDto, 'device123'),
      ).rejects.toThrow(SignupFailedException);

      // Verify error logging
      expect(loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during user signup',
        unexpectedError,
        {
          email: mockUserDto.email,
          deviceId: 'device123',
        },
      );
    });

    it('should handle maximum session limit during signup', async () => {
      const sessionError = new SessionLimitExceededException(
        mockDatabaseUser.id,
      );
      sessionService.createSessionWithToken.mockRejectedValue(sessionError);

      const [user, tokens] = await authService.signup(mockUserDto, 'device123');

      // Should still return user despite session limit warning
      expect(user.id).toBe(mockDatabaseUser.id);
      expect(tokens).toEqual({
        accessToken: 'mockToken',
        refreshToken: 'mockToken',
      });
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Session limit exceeded during signup',
        { userId: mockDatabaseUser.id },
      );
    });
  });

  describe('signin', () => {
    const mockPublicUser: PublicUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should generate tokens and create session for valid user', async () => {
      await authService.signin(mockPublicUser, 'device123');

      expect(sessionService.createSessionWithToken).toHaveBeenCalledWith(
        mockPublicUser.id,
        'device123',
        'mockToken',
        expect.any(Date),
      );
    });

    it('should handle session creation failures during signin', async () => {
      const sessionError = new SessionCreationFailedException(
        new Error('DB error'),
      );
      sessionService.createSessionWithToken.mockRejectedValue(sessionError);

      await expect(
        authService.signin(mockPublicUser, 'device123'),
      ).rejects.toThrow(SigninFailedException);
    });

    it('should handle concurrent signin attempts', async () => {
      // First call succeeds, second call fails
      sessionService.createSessionWithToken
        .mockResolvedValueOnce(mockDatabaseSession)
        .mockRejectedValueOnce(new SessionCreationFailedException(new Error()));

      // First successful signin
      await authService.signin(mockPublicUser, 'device123');

      // Second attempt with same device should fail
      await expect(
        authService.signin(mockPublicUser, 'device123'),
      ).rejects.toThrow(SigninFailedException);
    });
  });

  describe('validateCredentials', () => {
    it('should return user for valid credentials', async () => {
      userService.findByEmail.mockResolvedValue(mockDatabaseUser);
      jest.mocked(verify).mockResolvedValue(true);

      const result = await authService.validateCredentials(
        'test@example.com',
        'validPassword',
      );

      expect(result).toEqual(mockPublicUser);
      expect(verify).toHaveBeenCalledWith(
        'hashed_password123',
        'validPassword',
      );
    });

    it('should throw InvalidCredentialsException for wrong password', async () => {
      userService.findByEmail.mockResolvedValue(mockDatabaseUser);
      jest.mocked(verify).mockResolvedValue(false);

      await expect(
        authService.validateCredentials('test@example.com', 'wrongPassword'),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException for non-existent user', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateCredentials('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('renewAccessToken', () => {
    it('should generate new tokens without session update', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test',
      };

      const [user, tokens] = await authService.renewAccessToken(mockUser);

      expect(tokens.accessToken).toBe('mockToken');
      expect(tokens.refreshToken).toBe('mockToken');
      expect(user).toEqual(mockUser);
      expect(sessionService.createSessionWithToken).not.toHaveBeenCalled();
    });

    it('should handle JWT service failures', async () => {
      jwtService.signAsync.mockRejectedValue(new Error('JWT error'));

      await expect(
        authService.renewAccessToken(mockPublicUser),
      ).rejects.toThrow(TokenGenerationFailedException);
    });

    it('should include user data in returned tuple', async () => {
      const [user, tokens] = await authService.renewAccessToken(mockPublicUser);

      expect(user).toEqual(mockPublicUser);
      expect(tokens).toEqual({
        accessToken: 'mockToken',
        refreshToken: 'mockToken',
      });
    });
  });

  describe('signout', () => {
    const mockUser: PublicUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should successfully delete session', async () => {
      await authService.signout(mockUser, 'device123');

      expect(sessionService.deleteSession).toHaveBeenCalledWith(
        mockUser.id,
        'device123',
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        'User signout successful',
        {
          userId: mockUser.id,
          email: mockUser.email,
          deviceId: 'device123',
        },
      );
    });

    it('should handle session deletion failures', async () => {
      const sessionError = new Error('Session deletion failed');
      sessionService.deleteSession.mockRejectedValue(sessionError);

      await expect(authService.signout(mockUser, 'device123')).rejects.toThrow(
        SignoutFailedException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error during user signout',
        expect.any(SignoutFailedException),
      );
    });

    it('should handle unexpected errors during signout', async () => {
      const unexpectedError = new Error('Unexpected error');
      sessionService.deleteSession.mockRejectedValue(unexpectedError);

      await expect(authService.signout(mockUser, 'device123')).rejects.toThrow(
        SignoutFailedException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error during user signout',
        expect.any(SignoutFailedException),
      );
    });
  });

  describe('validateAccessToken', () => {
    const mockUser: DatabaseUser = {
      ...mockDatabaseUser,
      id: 'access-user',
    };

    it('should validate user with active session', async () => {
      userService.findByIdOrThrow.mockResolvedValue(mockUser);
      sessionService.verifySession.mockResolvedValue(undefined);

      const result = await authService.validateAccessToken(
        mockUser.id,
        'device123',
      );

      expect(result.id).toBe(mockUser.id);
      expect(sessionService.verifySession).toHaveBeenCalledWith(
        mockUser.id,
        'device123',
      );
    });

    it('should throw for non-existent user', async () => {
      userService.findByIdOrThrow.mockRejectedValue(
        new UserNotFoundException(),
      );

      await expect(
        authService.validateAccessToken('bad-user', 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });

    it('should handle expired sessions', async () => {
      userService.findByIdOrThrow.mockResolvedValue(mockUser);
      sessionService.verifySession.mockRejectedValue(
        new SessionExpiredException(),
      );

      await expect(
        authService.validateAccessToken(mockUser.id, 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });

    it('should handle invalid sessions', async () => {
      userService.findByIdOrThrow.mockResolvedValue(mockUser);
      sessionService.verifySession.mockRejectedValue(
        new SessionExpiredException(),
      );

      await expect(
        authService.validateAccessToken(mockUser.id, 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });

    it('should handle unexpected errors during validation', async () => {
      const unexpectedError = new Error('Unexpected validation error');
      userService.findByIdOrThrow.mockRejectedValue(unexpectedError);

      await expect(
        authService.validateAccessToken(mockUser.id, 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Access token validation failed',
        unexpectedError,
        {
          userId: mockUser.id,
          deviceId: 'device123',
        },
      );
    });
  });

  describe('validateRefreshToken', () => {
    const mockUser: DatabaseUser = {
      ...mockDatabaseUser,
      id: 'refresh-user',
    };

    it('should validate active refresh token', async () => {
      userService.findByIdOrThrow.mockResolvedValue(mockUser);
      sessionService.validateSession.mockResolvedValue({
        userId: mockUser.id,
        deviceId: 'device123',
        token: 'hashed_mockToken',
        expiresAt: new Date(Date.now() + 10000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });

      const result = await authService.validateRefreshToken(
        mockUser.id,
        'mockToken',
        'device123',
      );

      expect(result.id).toBe(mockUser.id);
      expect(sessionService.validateSession).toHaveBeenCalledWith(
        mockUser.id,
        'device123',
        'mockToken',
      );
    });

    it('should handle invalid refresh tokens', async () => {
      userService.findByIdOrThrow.mockResolvedValue(mockUser);
      sessionService.validateSession.mockRejectedValue(
        new SessionExpiredException(),
      );

      await expect(
        authService.validateRefreshToken(
          mockUser.id,
          'invalidToken',
          'device123',
        ),
      ).rejects.toThrow(AuthenticationFailedException);
    });

    it('should handle repository errors', async () => {
      const repoError = new SessionRepositoryException(
        'find',
        mockUser.id,
        'device123',
        new Error('DB error'),
      );
      sessionService.validateSession.mockRejectedValue(repoError);

      await expect(
        authService.validateRefreshToken(mockUser.id, 'mockToken', 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });
  });

  describe('edge cases', () => {
    it('should handle clock skew in token expiration', async () => {
      const expirationDate = new Date(Date.now() + 5000);
      sessionService.findAndVerifySession.mockResolvedValue({
        expiresAt: expirationDate,
        createdAt: new Date(),
        userId: 'user123',
        deviceId: 'device123',
        token: 'mockToken',
        lastUsedAt: new Date(),
      });

      // Validate with 10s clock skew
      jest.useFakeTimers().setSystemTime(Date.now() - 10000);
      userService.findByIdOrThrow.mockResolvedValue({
        ...mockDatabaseUser,
        id: 'user123',
      });

      await expect(
        authService.validateAccessToken('user123', 'device123'),
      ).resolves.toBeDefined();

      jest.useRealTimers();
    });

    it('should handle malformed JWT tokens', async () => {
      jwtService.signAsync.mockRejectedValue(new Error('Invalid JWT format'));

      await expect(
        authService.renewAccessToken(mockPublicUser),
      ).rejects.toThrow(TokenGenerationFailedException);
    });

    it('should handle database timeouts', async () => {
      const timeoutError = new Error('Database connection timeout');
      userService.findByIdOrThrow.mockRejectedValue(timeoutError);

      await expect(
        authService.validateAccessToken('user123', 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });
  });
});
