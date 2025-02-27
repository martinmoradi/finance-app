import {
  AuthenticationFailedException,
  InvalidCredentialsException,
} from '@/auth/exceptions';
import {
  UserNotFoundException,
  UserRepositoryException,
  UserRepositoryOperation,
} from '@/user/exceptions';
import {
  TestContext,
  mockDatabaseUser,
  mockPublicUser,
  mockUserDto,
  setupTestModule,
} from './auth-service.helper';
import { verify } from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
    jest.clearAllMocks();

    // Default mock implementation for verify
    jest
      .mocked(verify)
      .mockImplementation((hash, plain) =>
        Promise.resolve(hash === `hashed_${String(plain)}`),
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should call userService.findByEmailOrThrow with correct email', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;

      await context.authService.validateCredentials(email, password);

      expect(context.userService.findByEmailOrThrow).toHaveBeenCalledWith(
        email,
      );
    });

    it('should verify password against stored hash', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;

      await context.authService.validateCredentials(email, password);

      expect(verify).toHaveBeenCalledWith(mockDatabaseUser.password, password);
    });

    it('should throw InvalidCredentialsException when password is invalid', async () => {
      const email = mockUserDto.email;
      const password = 'wrong-password';

      jest.mocked(verify).mockResolvedValueOnce(false);

      await expect(
        context.authService.validateCredentials(email, password),
      ).rejects.toThrow(AuthenticationFailedException);

      try {
        await context.authService.validateCredentials(email, password);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationFailedException);
        expect((error as AuthenticationFailedException).cause).toBeInstanceOf(
          InvalidCredentialsException,
        );
      }
    });

    it('should return sanitized user data when credentials are valid', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;

      const result = await context.authService.validateCredentials(
        email,
        password,
      );

      expect(result).toEqual(mockPublicUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should log debug message when starting the operation', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;

      await context.authService.validateCredentials(email, password);

      expect(context.loggerService.debug).toHaveBeenCalledWith(
        'Starting credentials validation',
        expect.objectContaining({
          email,
          action: 'validateCredentials',
        }),
      );
    });

    it('should log info message when validation is successful', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;

      await context.authService.validateCredentials(email, password);

      expect(context.loggerService.info).toHaveBeenCalledWith(
        'Credentials validation successful',
        expect.objectContaining({
          email,
          action: 'validateCredentials',
        }),
      );
    });

    it('should log warning when validation fails due to business rules', async () => {
      const email = mockUserDto.email;
      const password = 'wrong-password';

      jest.mocked(verify).mockResolvedValueOnce(false);

      await expect(
        context.authService.validateCredentials(email, password),
      ).rejects.toThrow(AuthenticationFailedException);

      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'Credentials validation failed - validation error',
        expect.objectContaining({
          errorType: 'InvalidCredentialsException',
          reason: expect.any(String),
          email,
        }),
      );
    });

    it('should wrap UserRepositoryException in AuthenticationFailedException', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;
      const originalError = new UserRepositoryException(
        UserRepositoryOperation.FIND,
        email,
      );

      context.userService.findByEmailOrThrow.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.validateCredentials(email, password),
      ).rejects.toThrow(AuthenticationFailedException);

      try {
        await context.authService.validateCredentials(email, password);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationFailedException);
        expect((error as AuthenticationFailedException).cause).toBe(
          originalError,
        );
      }
    });

    it('should wrap InvalidCredentialsException in AuthenticationFailedException', async () => {
      const email = mockUserDto.email;
      const password = 'wrong-password';

      jest.mocked(verify).mockResolvedValueOnce(false);

      await expect(
        context.authService.validateCredentials(email, password),
      ).rejects.toThrow(AuthenticationFailedException);

      try {
        await context.authService.validateCredentials(email, password);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationFailedException);
        expect((error as AuthenticationFailedException).cause).toBeInstanceOf(
          InvalidCredentialsException,
        );
      }
    });

    it('should wrap UserNotFoundException in AuthenticationFailedException', async () => {
      const email = 'nonexistent@example.com';
      const password = mockUserDto.password;
      const originalError = new UserNotFoundException();

      context.userService.findByEmailOrThrow.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.validateCredentials(email, password),
      ).rejects.toThrow(AuthenticationFailedException);

      try {
        await context.authService.validateCredentials(email, password);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationFailedException);
        expect((error as AuthenticationFailedException).cause).toBe(
          originalError,
        );
      }

      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'Credentials validation failed - validation error',
        expect.objectContaining({
          errorType: 'UserNotFoundException',
          reason: expect.any(String),
          email,
        }),
      );
    });

    it('should rethrow existing AuthenticationFailedException without wrapping', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;
      const originalError = new AuthenticationFailedException(
        new Error('Original error'),
      );

      context.userService.findByEmailOrThrow.mockRejectedValueOnce(
        originalError,
      );

      try {
        await context.authService.validateCredentials(email, password);
        fail('Expected AuthenticationFailedException was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationFailedException);
        expect(error).toStrictEqual(originalError);
      }
    });

    it('should log error and wrap unexpected errors in AuthenticationFailedException', async () => {
      const email = mockUserDto.email;
      const password = mockUserDto.password;
      const originalError = new Error('Unexpected error');

      context.userService.findByEmailOrThrow.mockRejectedValueOnce(
        originalError,
      );

      await expect(
        context.authService.validateCredentials(email, password),
      ).rejects.toThrow(AuthenticationFailedException);

      expect(context.loggerService.error).toHaveBeenCalledWith(
        'Unexpected error during credentials validation',
        originalError,
        expect.objectContaining({
          email,
          action: 'validateCredentials',
        }),
      );

      try {
        await context.authService.validateCredentials(email, password);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationFailedException);
        expect((error as AuthenticationFailedException).cause).toBe(
          originalError,
        );
      }
    });
  });
});
