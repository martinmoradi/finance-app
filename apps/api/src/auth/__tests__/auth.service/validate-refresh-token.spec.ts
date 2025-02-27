import {
  InvalidDeviceIdException,
  TokenValidationFailedException,
} from '@/auth/exceptions';
import {
  SessionRepositoryException,
  SessionRepositoryOperation,
  SessionValidationException,
} from '@/session/exceptions';
import {
  UserNotFoundException,
  UserRepositoryException,
  UserRepositoryOperation,
} from '@/user/exceptions';
import { verify } from 'argon2';
import {
  TestContext,
  mockDatabaseUser,
  mockDeviceIds,
  mockPublicUser,
  setupTestModule,
} from './auth-service.helper';

jest.mock('argon2');

describe('AuthService', () => {
  let context: TestContext;
  const mockSession = {
    userId: mockDatabaseUser.id,
    deviceId: mockDeviceIds.valid,
    tokenId: 'valid-token-id',
    expiresAt: new Date(Date.now() + 3600000),
  };

  beforeEach(async () => {
    context = await setupTestModule();
    jest.clearAllMocks();

    // Default mock implementation for verify
    jest.mocked(verify).mockImplementation(() => Promise.resolve(true));

    // Setup getValidSession to return a valid session
    context.sessionService.getValidSession = jest
      .fn()
      .mockResolvedValue(mockSession);

    // Setup JWT decode to return a valid payload by default
    context.jwtService.decode = jest.fn().mockReturnValue({
      sub: mockDatabaseUser.id,
      jti: 'valid-token-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRefreshToken', () => {
    const userId = mockDatabaseUser.id;
    const deviceId = mockDeviceIds.valid;
    const refreshToken = 'valid-refresh-token';

    it('should call validateDeviceId with correct deviceId', async () => {
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      await context.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      expect(spy).toHaveBeenCalledWith(deviceId);
    });

    it('should call userService.findByIdOrThrow with correct userId', async () => {
      await context.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      expect(context.userService.findByIdOrThrow).toHaveBeenCalledWith(userId);
    });

    it('should call sessionService.getValidSession with correct parameters', async () => {
      await context.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      expect(context.sessionService.getValidSession).toHaveBeenCalledWith({
        userId,
        deviceId,
      });
    });

    it('should decode the JWT token to verify token ID', async () => {
      await context.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      expect(context.jwtService.decode).toHaveBeenCalledWith(refreshToken);
    });

    it('should throw InvalidRefreshTokenException if token has been rotated', async () => {
      // Mock decode to return a different token ID than what's in the session
      context.jwtService.decode = jest.fn().mockReturnValue({
        sub: mockDatabaseUser.id,
        jti: 'different-token-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);

      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'Token rotation detected - token reuse attempt',
        expect.objectContaining({
          userId,
          deviceId,
          action: 'validateRefreshToken',
        }),
      );
    });

    it('should return sanitized user data when token is valid', async () => {
      const result = await context.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      expect(result).toEqual(mockPublicUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should log debug message when starting the operation', async () => {
      await context.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      expect(context.loggerService.debug).toHaveBeenCalledWith(
        'Starting refresh token validation',
        expect.objectContaining({
          userId,
          deviceId,
          action: 'validateRefreshToken',
        }),
      );
    });

    it('should log info message when validation is successful', async () => {
      await context.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      expect(context.loggerService.info).toHaveBeenCalledWith(
        'Refresh token validation successful',
        expect.objectContaining({
          userId,
          deviceId,
          action: 'validateRefreshToken',
        }),
      );
    });

    it('should wrap SessionRepositoryException in TokenValidationFailedException', async () => {
      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.FIND,
        userId,
        deviceId,
      );

      context.sessionService.getValidSession.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'refresh',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap InvalidRefreshTokenException in TokenValidationFailedException', async () => {
      context.jwtService.decode.mockReturnValueOnce({
        sub: userId,
        jti: 'mismatched-token-id',
      });

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);
    });

    it('should wrap UserNotFoundException in TokenValidationFailedException', async () => {
      const originalError = new UserNotFoundException();

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'refresh',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap InvalidDeviceIdException in TokenValidationFailedException', async () => {
      const invalidDeviceId = mockDeviceIds.invalidFormat;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      spy.mockImplementationOnce(() => {
        throw new InvalidDeviceIdException();
      });

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          invalidDeviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateRefreshToken(
          userId,
          refreshToken,
          invalidDeviceId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'refresh',
        );
        expect((error as TokenValidationFailedException).cause).toBeInstanceOf(
          InvalidDeviceIdException,
        );
      }
    });

    it('should wrap SessionValidationException in TokenValidationFailedException', async () => {
      const originalError = new SessionValidationException(
        new Error('Session validation failed'),
      );

      context.sessionService.getValidSession.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'refresh',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap UserRepositoryException in TokenValidationFailedException', async () => {
      const originalError = new UserRepositoryException(
        UserRepositoryOperation.FIND,
        userId,
      );

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'refresh',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should rethrow existing TokenValidationFailedException without wrapping', async () => {
      const originalError = new TokenValidationFailedException(
        'refresh',
        new Error('Original error'),
      );

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      try {
        await context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        );
        fail('Expected TokenValidationFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect(error).toStrictEqual(originalError);
      }
    });

    it('should log error and wrap unexpected errors in TokenValidationFailedException', async () => {
      const originalError = new Error('Unexpected error');

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        ),
      ).rejects.toThrow(TokenValidationFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during refresh token validation',
        originalError,
        expect.objectContaining({
          userId,
          deviceId,
        }),
      );

      try {
        await context.authService.validateRefreshToken(
          userId,
          refreshToken,
          deviceId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'refresh',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });
  });
});
