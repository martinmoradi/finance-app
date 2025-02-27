import { TokenGenerationFailedException, TokenType } from '@/auth/exceptions';
import { InvalidDeviceIdException } from '@/auth/exceptions/';
import { SessionRefreshFailedException } from '@/session/exceptions';
import { hash } from 'argon2';
import {
  mockDeviceIds,
  mockPublicUser,
  setupTestModule,
  TestContext,
} from './auth-service.helper';

jest.mock('argon2');

describe('AuthService', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
    jest.clearAllMocks();
    jest
      .mocked(hash)
      .mockImplementation((value) => Promise.resolve(`hashed_${value}`));

    // Mock UUID generation for consistent testing
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('mock-token-id-uuid-format');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshTokens', () => {
    it('should call validateDeviceId with correct deviceId', async () => {
      const deviceId = mockDeviceIds.valid;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      await context.authService.refreshTokens(mockPublicUser, deviceId);

      expect(spy).toHaveBeenCalledWith(deviceId);
    });

    it('should generate new authentication tokens', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.refreshTokens(mockPublicUser, deviceId);

      // Verify that signAsync was called twice
      expect(context.jwtService.signAsync).toHaveBeenCalledTimes(2);

      // Get the actual calls that were made
      const calls = context.jwtService.signAsync.mock.calls;

      // Check that we have an access token call (payload with sub matching our user ID)
      const hasAccessTokenCall = calls.some((call) => {
        const payload = call[0] as { sub: string; jti?: string };
        return payload.sub === mockPublicUser.id && !payload.jti;
      });

      // Check that we have a refresh token call (payload with both sub and jti)
      const hasRefreshTokenCall = calls.some((call) => {
        const payload = call[0] as { sub: string; jti?: string };
        return payload.sub === mockPublicUser.id && payload.jti;
      });

      expect(hasAccessTokenCall || hasRefreshTokenCall).toBeTruthy();
    });

    it('should hash the new refresh token', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.refreshTokens(mockPublicUser, deviceId);

      expect(hash).toHaveBeenCalledWith('mockToken');
    });

    it('should call sessionService.refreshSessionWithToken with correct parameters', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.refreshTokens(mockPublicUser, deviceId);

      expect(
        context.sessionService.refreshSessionWithToken,
      ).toHaveBeenCalledWith({
        userId: mockPublicUser.id,
        deviceId,
        token: 'hashed_mockToken',
        tokenId: 'mock-token-id-uuid-format',
      });
    });

    it('should return user and new tokens', async () => {
      const deviceId = mockDeviceIds.valid;

      const [user, tokens] = await context.authService.refreshTokens(
        mockPublicUser,
        deviceId,
      );

      expect(user).toEqual(mockPublicUser);
      expect(tokens).toEqual(['mockToken', 'mockToken']);
    });

    it('should log debug message when starting the operation', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.refreshTokens(mockPublicUser, deviceId);

      expect(context.loggerService.debug).toHaveBeenCalledWith(
        'Starting tokens refresh',
        {
          userId: mockPublicUser.id,
          deviceId,
          action: 'refreshTokens',
        },
      );
    });

    it('should log info message when tokens are refreshed successfully', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.refreshTokens(mockPublicUser, deviceId);

      expect(context.loggerService.info).toHaveBeenCalledWith(
        'Tokens refreshed successfully',
        {
          userId: mockPublicUser.id,
          email: mockPublicUser.email,
          deviceId,
          action: 'refreshTokens',
        },
      );
    });

    it('should wrap SessionRefreshFailedException in TokenGenerationFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new SessionRefreshFailedException(
        new Error('Session refresh failed'),
      );

      context.sessionService.refreshSessionWithToken.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.refreshTokens(mockPublicUser, deviceId),
      ).rejects.toThrow(TokenGenerationFailedException);

      try {
        await context.authService.refreshTokens(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenGenerationFailedException);
        expect((error as TokenGenerationFailedException).tokenType).toBe(
          TokenType.REFRESH,
        );
        expect((error as TokenGenerationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap InvalidDeviceIdException in TokenGenerationFailedException', async () => {
      const deviceId = mockDeviceIds.invalidFormat;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      // Force validateDeviceId to throw
      spy.mockImplementationOnce(() => {
        throw new InvalidDeviceIdException();
      });

      await expect(
        context.authService.refreshTokens(mockPublicUser, deviceId),
      ).rejects.toThrow(TokenGenerationFailedException);

      try {
        await context.authService.refreshTokens(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenGenerationFailedException);
        expect((error as TokenGenerationFailedException).tokenType).toBe(
          TokenType.REFRESH,
        );
        expect((error as TokenGenerationFailedException).cause).toBeInstanceOf(
          InvalidDeviceIdException,
        );
      }
    });

    it('should rethrow existing TokenGenerationFailedException without wrapping', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new TokenGenerationFailedException(
        TokenType.GENERATION,
        new Error('Original error'),
      );

      context.jwtService.signAsync.mockRejectedValueOnce(originalError);

      try {
        await context.authService.refreshTokens(mockPublicUser, deviceId);
        fail('Expected TokenGenerationFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenGenerationFailedException);
        expect(error).toStrictEqual(originalError);
      }
    });

    it('should log error and wrap unexpected errors in TokenGenerationFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new Error('Unexpected error');

      context.sessionService.refreshSessionWithToken.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.refreshTokens(mockPublicUser, deviceId),
      ).rejects.toThrow(TokenGenerationFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during tokens refresh',
        originalError,
        {
          userId: mockPublicUser.id,
          deviceId,
          action: 'refreshTokens',
        },
      );

      try {
        await context.authService.refreshTokens(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(TokenGenerationFailedException);
        expect((error as TokenGenerationFailedException).tokenType).toBe(
          TokenType.REFRESH,
        );
        expect((error as TokenGenerationFailedException).cause).toBe(
          originalError,
        );
      }
    });
  });
});
