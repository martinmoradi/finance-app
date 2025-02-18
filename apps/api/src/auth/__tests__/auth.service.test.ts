import { AuthService } from '@/auth/auth.service';
import {
  AuthenticationFailedException,
  InvalidCredentialsException,
  SigninFailedException,
  SignoutFailedException,
  SignupFailedException,
  TokenGenerationFailedException,
} from '@/auth/exceptions';
import { LoggerService } from '@/logger/logger.service';
import {
  InvalidRefreshTokenException,
  SessionCreationFailedException,
  SessionExpiredException,
  SessionLimitExceededException,
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
import { DatabaseUser, PublicUser } from '@repo/types';
import { verify } from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Argon2 and JWT directly
vi.mock('argon2', () => ({
  hash: vi.fn().mockImplementation((pass) => Promise.resolve(`hashed_${pass}`)),
  verify: vi
    .fn()
    .mockImplementation((hashed, plain) =>
      Promise.resolve(hashed === `hashed_${plain}`),
    ),
}));

vi.mock('@nestjs/jwt', () => ({
  JwtService: vi.fn(() => ({
    signAsync: vi.fn().mockResolvedValue('mockToken'),
  })),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let sessionService: SessionService;
  let jwtService: JwtService;
  let loggerService: LoggerService;

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

  // Add mock session object
  const mockDatabaseSession = {
    userId: 'user123',
    deviceId: 'device123',
    token: 'mockToken',
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock implementations
    userService = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByIdOrThrow: vi.fn().mockResolvedValue(mockDatabaseUser),
      create: vi.fn().mockResolvedValue(mockDatabaseUser),
      delete: vi.fn().mockResolvedValue(true),
    } as unknown as UserService;

    sessionService = {
      createSessionWithToken: vi.fn().mockResolvedValue(mockDatabaseSession),
      findAndVerifySession: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
      validateSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionService;

    loggerService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as LoggerService;

    jwtService = new JwtService();

    authService = new AuthService(
      userService,
      sessionService,
      jwtService,
      loggerService,
      {
        expiresIn: '7d',
        secret: 'testSecret',
      },
    );
  });

  describe('signup', () => {
    it('should successfully create a new user and session', async () => {
      // Execute
      const result = await authService.signup(mockUserDto, 'device123');

      // Assertions
      expect(result).toEqual({
        ...mockPublicUser,
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
      vi.mocked(sessionService.createSessionWithToken).mockRejectedValue(
        sessionError,
      );

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
      vi.mocked(userService.findByEmail).mockResolvedValue(mockDatabaseUser);

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
      vi.mocked(jwtService.signAsync).mockRejectedValue(jwtError);

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
      vi.mocked(userService.findByEmail).mockRejectedValue(unexpectedError);

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
      vi.mocked(sessionService.createSessionWithToken).mockRejectedValue(
        sessionError,
      );

      const result = await authService.signup(mockUserDto, 'device123');

      // Should still return user despite session limit warning
      expect(result.id).toBe(mockDatabaseUser.id);
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
      vi.mocked(sessionService.createSessionWithToken).mockRejectedValue(
        sessionError,
      );

      await expect(
        authService.signin(mockPublicUser, 'device123'),
      ).rejects.toThrow(SigninFailedException);
    });

    it('should handle concurrent signin attempts', async () => {
      vi.mocked(sessionService.createSessionWithToken)
        .mockResolvedValueOnce(mockDatabaseSession) // First successful call
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
      vi.mocked(userService.findByEmail).mockResolvedValue(mockDatabaseUser);
      vi.mocked(verify).mockResolvedValue(true);

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
      vi.mocked(userService.findByEmail).mockResolvedValue(mockDatabaseUser);
      vi.mocked(verify).mockResolvedValue(false);

      await expect(
        authService.validateCredentials('test@example.com', 'wrongPassword'),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('renewAccessToken', () => {
    it('should generate new tokens without session update', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test',
      };

      const result = await authService.renewAccessToken(mockUser);

      expect(result.accessToken).toBe('mockToken');
      expect(result.refreshToken).toBe('mockToken');
      expect(sessionService.createSessionWithToken).not.toHaveBeenCalled();
    });

    it('should handle JWT service failures', async () => {
      vi.mocked(jwtService.signAsync).mockRejectedValue(new Error('JWT error'));

      await expect(
        authService.renewAccessToken(mockPublicUser),
      ).rejects.toThrow(TokenGenerationFailedException);
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
      vi.mocked(sessionService.deleteSession).mockRejectedValue(sessionError);

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
      vi.mocked(userService.findByIdOrThrow).mockResolvedValue(mockUser);
      vi.mocked(sessionService.findAndVerifySession).mockResolvedValue({
        userId: mockUser.id,
        deviceId: 'device123',
        expiresAt: new Date(Date.now() + 10000),
        createdAt: new Date(),
        token: 'mockToken',
        lastUsedAt: new Date(),
      });

      const result = await authService.validateAccessToken(
        mockUser.id,
        'device123',
      );

      expect(result.id).toBe(mockUser.id);
      expect(sessionService.findAndVerifySession).toHaveBeenCalledWith(
        mockUser.id,
        'device123',
      );
    });

    it('should throw for non-existent user', async () => {
      vi.mocked(userService.findByIdOrThrow).mockRejectedValue(
        new UserNotFoundException(),
      );

      await expect(
        authService.validateAccessToken('bad-user', 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });

    it('should handle expired sessions', async () => {
      vi.mocked(userService.findByIdOrThrow).mockResolvedValue(mockUser);
      vi.mocked(sessionService.findAndVerifySession).mockRejectedValue(
        new SessionExpiredException(),
      );

      await expect(
        authService.validateAccessToken(mockUser.id, 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });
  });

  describe('validateRefreshToken', () => {
    const mockUser: DatabaseUser = {
      ...mockDatabaseUser,
      id: 'refresh-user',
    };

    it('should validate active refresh token', async () => {
      vi.mocked(userService.findByIdOrThrow).mockResolvedValue(mockUser);
      vi.mocked(sessionService.validateSession).mockResolvedValue({
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
      vi.mocked(userService.findByIdOrThrow).mockResolvedValue(mockUser);
      vi.mocked(sessionService.validateSession).mockRejectedValue(
        new InvalidRefreshTokenException(),
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
      vi.mocked(sessionService.validateSession).mockRejectedValue(repoError);

      await expect(
        authService.validateRefreshToken(mockUser.id, 'mockToken', 'device123'),
      ).rejects.toThrow(AuthenticationFailedException);
    });
  });

  describe('edge cases', () => {
    it('should handle clock skew in token expiration', async () => {
      const expirationDate = new Date(Date.now() + 5000);
      vi.mocked(sessionService.findAndVerifySession).mockResolvedValue({
        expiresAt: expirationDate,
        createdAt: new Date(),
        userId: 'user123',
        deviceId: 'device123',
        token: 'mockToken',
        lastUsedAt: new Date(),
      });

      // Validate with 10s clock skew
      vi.useFakeTimers({ now: Date.now() - 10000 });
      vi.mocked(userService.findByIdOrThrow).mockResolvedValue({
        ...mockDatabaseUser,
        id: 'user123',
      });
      await expect(
        authService.validateAccessToken('user123', 'device123'),
      ).resolves.toBeDefined();
      vi.useRealTimers();
    });
  });
});
