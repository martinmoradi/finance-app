import {
  InvalidDeviceIdException,
  TokenValidationFailedException,
} from '@/auth/exceptions';
import {
  SessionExpiredException,
  SessionValidationException,
} from '@/session/exceptions';
import {
  UserNotFoundException,
  UserRepositoryException,
  UserRepositoryOperation,
} from '@/user/exceptions';
import {
  TestContext,
  mockDatabaseUser,
  mockDeviceIds,
  mockPublicUser,
  setupTestModule,
} from './auth-service.helper';

describe('AuthService', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAccessToken', () => {
    it('should call validateDeviceId with correct deviceId', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      await context.authService.validateAccessToken(userId, deviceId);

      expect(spy).toHaveBeenCalledWith(deviceId);
    });

    it('should call userService.findByIdOrThrow with correct userId', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;

      await context.authService.validateAccessToken(userId, deviceId);

      expect(context.userService.findByIdOrThrow).toHaveBeenCalledWith(userId);
    });

    it('should call sessionService.verifySession with correct parameters', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;

      await context.authService.validateAccessToken(userId, deviceId);

      expect(context.sessionService.verifySession).toHaveBeenCalledWith({
        userId,
        deviceId,
      });
    });

    it('should return sanitized user data when token is valid', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;

      const result = await context.authService.validateAccessToken(
        userId,
        deviceId,
      );

      expect(result).toEqual(mockPublicUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should log debug message when starting the operation', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;

      await context.authService.validateAccessToken(userId, deviceId);

      expect(context.loggerService.debug).toHaveBeenCalledWith(
        'Starting access token validation',
        expect.objectContaining({
          userId,
          deviceId,
          action: 'validateAccessToken',
        }),
      );
    });

    it('should log info message when validation is successful', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;

      await context.authService.validateAccessToken(userId, deviceId);

      expect(context.loggerService.info).toHaveBeenCalledWith(
        'Access token validation successful',
        expect.objectContaining({
          userId,
          deviceId,
          action: 'validateAccessToken',
        }),
      );
    });

    it('should wrap UserRepositoryException in TokenValidationFailedException', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;
      const originalError = new UserRepositoryException(
        UserRepositoryOperation.FIND,
        userId,
      );

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateAccessToken(userId, deviceId),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateAccessToken(userId, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'access',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap SessionValidationException in TokenValidationFailedException', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;
      const originalError = new SessionValidationException(
        new Error('Session validation failed'),
      );

      context.sessionService.verifySession.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateAccessToken(userId, deviceId),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateAccessToken(userId, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'access',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap InvalidDeviceIdException in TokenValidationFailedException', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.invalidFormat;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      spy.mockImplementationOnce(() => {
        throw new InvalidDeviceIdException();
      });

      await expect(
        context.authService.validateAccessToken(userId, deviceId),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateAccessToken(userId, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'access',
        );
        expect((error as TokenValidationFailedException).cause).toBeInstanceOf(
          InvalidDeviceIdException,
        );
      }
    });

    it('should wrap UserNotFoundException in TokenValidationFailedException', async () => {
      const userId = 'non-existent-user-id';
      const deviceId = mockDeviceIds.valid;
      const originalError = new UserNotFoundException();

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateAccessToken(userId, deviceId),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateAccessToken(userId, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'access',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap SessionExpiredException in TokenValidationFailedException', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;
      const originalError = new SessionExpiredException();

      context.sessionService.verifySession.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateAccessToken(userId, deviceId),
      ).rejects.toThrow(TokenValidationFailedException);

      try {
        await context.authService.validateAccessToken(userId, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'access',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should rethrow existing TokenValidationFailedException without wrapping', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;
      const originalError = new TokenValidationFailedException(
        'access',
        new Error('Original error'),
      );

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      try {
        await context.authService.validateAccessToken(userId, deviceId);
        fail('Expected TokenValidationFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect(error).toStrictEqual(originalError);
      }
    });

    it('should log error and wrap unexpected errors in TokenValidationFailedException', async () => {
      const userId = mockDatabaseUser.id;
      const deviceId = mockDeviceIds.valid;
      const originalError = new Error('Unexpected error');

      context.userService.findByIdOrThrow.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.validateAccessToken(userId, deviceId),
      ).rejects.toThrow(TokenValidationFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during access token validation',
        originalError,
        expect.objectContaining({
          userId,
          deviceId,
          action: 'validateAccessToken',
        }),
      );

      try {
        await context.authService.validateAccessToken(userId, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenValidationFailedException);
        expect((error as TokenValidationFailedException).tokenType).toBe(
          'access',
        );
        expect((error as TokenValidationFailedException).cause).toBe(
          originalError,
        );
      }
    });
  });
});
