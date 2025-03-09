import {
  InvalidDeviceIdException,
  SignoutFailedException,
} from '@/auth/exceptions';
import {
  SessionRepositoryException,
  SessionRepositoryOperation,
} from '@/session/exceptions';
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signout', () => {
    it('should call validateDeviceId with correct deviceId', async () => {
      const deviceId = mockDeviceIds.valid;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      await context.authService.signout(mockPublicUser, deviceId);

      expect(spy).toHaveBeenCalledWith(deviceId);
    });

    it('should call sessionService.deleteSession with correct parameters', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signout(mockPublicUser, deviceId);

      expect(context.sessionService.deleteSession).toHaveBeenCalledWith({
        userId: mockPublicUser.id,
        deviceId,
      });
    });

    it('should log debug message when starting the operation', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signout(mockPublicUser, deviceId);

      expect(context.loggerService.debug).toHaveBeenCalledWith(
        'Starting user signout',
        {
          userId: mockPublicUser.id,
          deviceId,
          action: 'signout',
        },
      );
    });

    it('should log info message when signout completes successfully', async () => {
      const deviceId = mockDeviceIds.valid;

      await context.authService.signout(mockPublicUser, deviceId);

      expect(context.loggerService.info).toHaveBeenCalledWith(
        'User signout successful',
        {
          userId: mockPublicUser.id,
          email: mockPublicUser.email,
          deviceId,
          action: 'signout',
        },
      );
    });

    it('should wrap SessionRepositoryException in SignoutFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new SessionRepositoryException(
        SessionRepositoryOperation.DELETE,
        mockPublicUser.id,
        deviceId,
        new Error('DB error'),
      );

      context.sessionService.deleteSession.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.signout(mockPublicUser, deviceId),
      ).rejects.toThrow(SignoutFailedException);

      try {
        await context.authService.signout(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignoutFailedException);
        expect((error as SignoutFailedException).cause).toBe(originalError);
      }
    });

    it('should wrap InvalidDeviceIdException in SignoutFailedException', async () => {
      const deviceId = mockDeviceIds.invalidFormat;
      const spy = jest.spyOn(context.authService, 'validateDeviceId');

      spy.mockImplementationOnce(() => {
        throw new InvalidDeviceIdException();
      });

      await expect(
        context.authService.signout(mockPublicUser, deviceId),
      ).rejects.toThrow(SignoutFailedException);

      try {
        await context.authService.signout(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignoutFailedException);
        expect((error as SignoutFailedException).cause).toBeInstanceOf(
          InvalidDeviceIdException,
        );
      }
    });

    it('should rethrow existing SignoutFailedException without wrapping', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new SignoutFailedException(
        new Error('Already wrapped'),
      );

      context.sessionService.deleteSession.mockRejectedValueOnce(originalError);

      try {
        await context.authService.signout(mockPublicUser, deviceId);
        fail('Expected SignoutFailedException was not thrown');
      } catch (error) {
        expect(error).toStrictEqual(originalError);
      }
    });

    it('should log error and wrap unexpected errors in SignoutFailedException', async () => {
      const deviceId = mockDeviceIds.valid;
      const originalError = new Error('Unexpected error');

      context.sessionService.deleteSession.mockRejectedValueOnce(originalError);

      await expect(
        context.authService.signout(mockPublicUser, deviceId),
      ).rejects.toThrow(SignoutFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during user signout',
        originalError,
        {
          userId: mockPublicUser.id,
          deviceId,
          action: 'signout',
        },
      );

      try {
        await context.authService.signout(mockPublicUser, deviceId);
      } catch (error) {
        expect(error).toBeInstanceOf(SignoutFailedException);
        expect((error as SignoutFailedException).cause).toBe(originalError);
      }
    });
  });
});
