import {
  AuthRepositoryException,
  InvalidDeviceIdException,
  SigninFailedException,
  TokenGenerationFailedException,
  TokenType,
} from '@/auth/exceptions';
import {
  TestContext,
  mockDeviceIds,
  mockPublicUser,
  setupTestModule,
} from './auth-service.helper';

describe('AuthService', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
    jest.clearAllMocks();

    // Mock UUID generation to have consistent test results
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('mock-token-id-uuid-format');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signin', () => {
    it('should call validateDeviceId with correct deviceId', async () => {
      const deviceId = mockDeviceIds.valid;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      await context.authService.signin(mockPublicUser, deviceId);

      expect(spy).toHaveBeenCalledWith(deviceId);
    });

    it('should generate authentication tokens', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signin(mockPublicUser, deviceId);

      expect(context.jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockPublicUser.id, jti: 'mock-token-id-uuid-format' },
        expect.objectContaining({
          expiresIn: expect.any(String),
          secret: expect.any(String),
        }),
      );
    });

    it('should call sessionService.createSessionWithToken with correct parameters', async () => {
      const deviceId = mockDeviceIds.valid;
      const mockExpiresAt = expect.any(Date);

      await context.authService.signin(mockPublicUser, deviceId);

      expect(
        context.sessionService.createSessionWithToken,
      ).toHaveBeenCalledWith({
        userId: mockPublicUser.id,
        deviceId,
        token: 'mockToken',
        tokenId: 'mock-token-id-uuid-format',
        expiresAt: mockExpiresAt,
      });
    });

    it('should return user and tokens', async () => {
      const deviceId = mockDeviceIds.valid;

      const [user, tokens] = await context.authService.signin(
        mockPublicUser,
        deviceId,
      );

      expect(user).toEqual(mockPublicUser);
      expect(tokens).toEqual(['mockToken', 'mockToken']);
    });

    it('should log debug message when starting the operation', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signin(mockPublicUser, deviceId);

      expect(context.loggerService.debug).toHaveBeenCalledWith(
        'Starting user signin',
        {
          userId: mockPublicUser.id,
          deviceId,
          action: 'signin',
        },
      );
    });

    it('should log info message when signin completes successfully', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signin(mockPublicUser, deviceId);

      expect(context.loggerService.info).toHaveBeenCalledWith(
        'User signin successful',
        {
          userId: mockPublicUser.id,
          email: mockPublicUser.email,
          deviceId,
          action: 'signin',
        },
      );
    });

    it('should wrap TokenGenerationFailedException in SigninFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new TokenGenerationFailedException(
        TokenType.GENERATION,
        new Error('Token generation failed'),
      );

      context.jwtService.signAsync.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.signin(mockPublicUser, deviceId),
      ).rejects.toThrow(SigninFailedException);

      try {
        await context.authService.signin(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SigninFailedException);
        expect((error as SigninFailedException).cause).toBe(originalError);
      }
    });

    it('should wrap existing SigninFailedException without additional wrapping', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new SigninFailedException(
        new Error('Already wrapped'),
      );

      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        originalError,
      );

      try {
        await context.authService.signin(mockPublicUser, deviceId);
        fail('Expected SigninFailedException was not thrown');
      } catch (error) {
        expect(error).toStrictEqual(originalError);
      }
    });

    it('should wrap InvalidDeviceIdException in SigninFailedException', async () => {
      const deviceId = mockDeviceIds.invalidFormat;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      spy.mockImplementationOnce(() => {
        throw new InvalidDeviceIdException();
      });

      await expect(
        context.authService.signin(mockPublicUser, deviceId),
      ).rejects.toThrow(SigninFailedException);

      try {
        await context.authService.signin(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SigninFailedException);
        expect((error as SigninFailedException).cause).toBeInstanceOf(
          InvalidDeviceIdException,
        );
      }
    });

    it('should wrap AuthRepositoryException in SigninFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new AuthRepositoryException(
        'create',
        mockPublicUser.id,
        new Error('DB error'),
      );

      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.signin(mockPublicUser, deviceId),
      ).rejects.toThrow(SigninFailedException);

      try {
        await context.authService.signin(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SigninFailedException);
        expect((error as SigninFailedException).cause).toBe(originalError);
      }
    });

    it('should log error and wrap unexpected errors in SigninFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new Error('Unexpected error');

      context.sessionService.createSessionWithToken.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.signin(mockPublicUser, deviceId),
      ).rejects.toThrow(SigninFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during user signin',
        originalError,
        {
          userId: mockPublicUser.id,
          deviceId,
          action: 'signin',
        },
      );

      try {
        await context.authService.signin(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SigninFailedException);
        expect((error as SigninFailedException).cause).toBe(originalError);
      }
    });
  });
});
