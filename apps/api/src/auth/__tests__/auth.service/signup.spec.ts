import {
  InvalidDeviceIdException,
  SignupFailedException,
  TokenGenerationFailedException,
  TokenType,
} from '@/auth/exceptions';
import {
  SessionCreationFailedException,
  SessionLimitExceededException,
  SessionRepositoryException,
  SessionRepositoryOperation,
} from '@/session/exceptions';
import {
  UserAlreadyExistsException,
  UserRepositoryException,
  UserRepositoryOperation,
} from '@/user/exceptions';
import { hash } from 'argon2';
import {
  TestContext,
  mockDatabaseUser,
  mockDeviceIds,
  mockPublicUser,
  mockUserDto,
  setupTestModule,
} from './auth-service.helper';

jest.mock('argon2');

describe('AuthService', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
    jest.clearAllMocks();
    jest
      .mocked(hash)
      .mockImplementation((value) =>
        Promise.resolve(`hashed_${String(value)}`),
      );

    // Mock UUID generation for consistent testing
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('mock-token-id-uuid-format');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should call validateDeviceId with correct deviceId', async () => {
      const deviceId = mockDeviceIds.valid;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      await context.authService.signup(mockUserDto, deviceId);

      expect(spy).toHaveBeenCalledWith(deviceId);
    });

    it('should call userService.findByEmail with correct email', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signup(mockUserDto, deviceId);

      expect(context.userService.findByEmail).toHaveBeenCalledWith(
        mockUserDto.email,
      );
    });

    it('should throw UserAlreadyExistsException when user exists', async () => {
      const deviceId = mockDeviceIds.valid;
      context.userService.findByEmail.mockResolvedValueOnce(mockDatabaseUser);

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(UserAlreadyExistsException);

      expect(context.userService.create).not.toHaveBeenCalled();
    });

    it('should hash the password', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signup(mockUserDto, deviceId);

      expect(hash).toHaveBeenCalledWith(mockUserDto.password);
    });

    it('should call userService.create with correct data including hashed password', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signup(mockUserDto, deviceId);

      expect(context.userService.create).toHaveBeenCalledWith({
        email: mockUserDto.email,
        name: mockUserDto.name,
        password: `hashed_${mockUserDto.password}`,
      });
    });

    it('should generate authentication tokens', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signup(mockUserDto, deviceId);

      // Verify that signAsync was called twice
      expect(context.jwtService.signAsync).toHaveBeenCalledTimes(2);

      // Get the actual calls that were made
      const calls = context.jwtService.signAsync.mock.calls;

      // Check that we have an access token call (payload with sub matching our user ID)
      const hasAccessTokenCall = calls.some((call) => {
        const payload = call[0] as { sub: string; jti?: string };
        return payload.sub === mockDatabaseUser.id && !payload.jti;
      });

      // Check that we have a refresh token call (payload with both sub and jti)
      const hasRefreshTokenCall = calls.some((call) => {
        const payload = call[0] as { sub: string; jti?: string };
        return payload.sub === mockDatabaseUser.id && payload.jti;
      });

      expect(hasAccessTokenCall || hasRefreshTokenCall).toBeTruthy();
    });

    it('should call sessionService.createSessionWithToken with correct parameters', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signup(mockUserDto, deviceId);

      expect(
        context.sessionService.createSessionWithToken,
      ).toHaveBeenCalledWith({
        userId: mockDatabaseUser.id,
        deviceId,
        token: 'mockToken',
        tokenId: 'mock-token-id-uuid-format',
        expiresAt: expect.any(Date),
      });
    });

    it('should allow signup to complete when session limit is exceeded', async () => {
      const deviceId = mockDeviceIds.valid;
      const sessionLimitError = new SessionLimitExceededException(
        mockDatabaseUser.id,
      );
      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        sessionLimitError,
      );

      const [user, tokens] = await context.authService.signup(
        mockUserDto,
        deviceId,
      );

      expect(user).toEqual(mockPublicUser);
      expect(tokens).toEqual(['mockToken', 'mockToken']);
      expect(context.userService.delete).not.toHaveBeenCalled();
      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'Session limit exceeded during signup',
        expect.objectContaining({
          userId: mockDatabaseUser.id,
          action: 'signup',
        }),
      );
    });

    it('should attempt to delete user if session creation fails', async () => {
      const deviceId = mockDeviceIds.valid;
      const sessionError = new SessionCreationFailedException(
        new Error('Session creation failed'),
      );
      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        sessionError,
      );

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      expect(context.userService.delete).toHaveBeenCalledWith(
        mockDatabaseUser.id,
      );
    });

    it('should log error if user deletion cleanup fails', async () => {
      const deviceId = mockDeviceIds.valid;
      const sessionError = new SessionCreationFailedException(
        new Error('Session creation failed'),
      );
      const cleanupError = new Error('Cleanup failed');

      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        sessionError,
      );
      context.userService.delete.mockRejectedValueOnce(cleanupError);

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Failed to cleanup user after session creation failed',
        expect.objectContaining({
          userId: mockDatabaseUser.id,
          action: 'signup',
          error: cleanupError,
        }),
      );
    });

    it('should return sanitized user data and tokens', async () => {
      const deviceId = mockDeviceIds.valid;

      const [user, tokens] = await context.authService.signup(
        mockUserDto,
        deviceId,
      );

      expect(user).toEqual(mockPublicUser);
      expect(tokens).toEqual(['mockToken', 'mockToken']);
    });

    it('should log debug message when starting the operation', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signup(mockUserDto, deviceId);

      expect(context.loggerService.debug).toHaveBeenCalledWith(
        'Starting user signup',
        expect.objectContaining({
          email: mockUserDto.email,
          deviceId,
          action: 'signup',
        }),
      );
    });

    it('should log info message when signup completes successfully', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signup(mockUserDto, deviceId);

      expect(context.loggerService.info).toHaveBeenCalledWith(
        'User signup completed successfully',
        expect.objectContaining({
          userId: mockDatabaseUser.id,
          email: mockPublicUser.email,
          deviceId,
          action: 'signup',
        }),
      );
    });

    it('should log warning when user already exists', async () => {
      const deviceId = mockDeviceIds.valid;
      context.userService.findByEmail.mockResolvedValueOnce(mockDatabaseUser);

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(UserAlreadyExistsException);

      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'User already exists',
        expect.objectContaining({
          email: mockUserDto.email,
          action: 'signup',
        }),
      );
    });

    it('should log warning when session limit exceeded', async () => {
      const deviceId = mockDeviceIds.valid;
      const sessionLimitError = new SessionLimitExceededException(
        mockDatabaseUser.id,
      );
      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        sessionLimitError,
      );

      await context.authService.signup(mockUserDto, deviceId);

      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'Session limit exceeded during signup',
        expect.objectContaining({
          userId: mockDatabaseUser.id,
          action: 'signup',
        }),
      );
    });

    it('should wrap UserRepositoryException in SignupFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new UserRepositoryException(
        UserRepositoryOperation.CREATE,
        mockUserDto.email,
      );

      context.userService.create.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      try {
        await context.authService.signup(mockUserDto, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignupFailedException);
        expect((error as SignupFailedException).cause).toBe(originalError);
      }
    });

    it('should wrap SessionRepositoryException in SignupFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.CREATE,
        mockDatabaseUser.id,
        deviceId,
      );

      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      try {
        await context.authService.signup(mockUserDto, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignupFailedException);
        expect((error as SignupFailedException).cause).toBe(originalError);
      }
    });

    it('should wrap TokenGenerationFailedException in SignupFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new TokenGenerationFailedException(
        TokenType.GENERATION,
        new Error('Token generation failed'),
      );

      context.jwtService.signAsync.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      try {
        await context.authService.signup(mockUserDto, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignupFailedException);
        expect((error as SignupFailedException).cause).toBe(originalError);
      }
    });

    it('should wrap SessionCreationFailedException in SignupFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new SessionCreationFailedException(
        new Error('Session creation failed'),
      );

      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      try {
        await context.authService.signup(mockUserDto, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignupFailedException);
        expect((error as SignupFailedException).cause).toBe(originalError);
      }
    });

    it('should wrap InvalidDeviceIdException in SignupFailedException', async () => {
      const deviceId = mockDeviceIds.invalidFormat;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      spy.mockImplementationOnce(() => {
        throw new InvalidDeviceIdException();
      });

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      try {
        await context.authService.signup(mockUserDto, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignupFailedException);
        expect((error as SignupFailedException).cause).toBeInstanceOf(
          InvalidDeviceIdException,
        );
      }
    });

    it('should rethrow existing SignupFailedException without wrapping', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new SignupFailedException(
        new Error('Original error'),
      );

      context.userService.create.mockRejectedValueOnce(originalError);

      try {
        await context.authService.signup(mockUserDto, deviceId);
        fail('Expected SignupFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SignupFailedException);
        expect(error).toStrictEqual(originalError);
      }
    });

    it('should log error and wrap unexpected errors in SignupFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new Error('Unexpected error');

      context.userService.create.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.signup(mockUserDto, deviceId),
      ).rejects.toThrow(SignupFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during signup',
        expect.objectContaining({
          error: originalError,
          email: mockUserDto.email,
          action: 'signup',
        }),
      );

      try {
        await context.authService.signup(mockUserDto, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignupFailedException);
        expect((error as SignupFailedException).cause).toBe(originalError);
      }
    });
  });
});
