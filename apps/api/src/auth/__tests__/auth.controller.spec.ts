import { CookieService } from '@/cookie/cookie.service';
import { LoggerService } from '@/logger/logger.service';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PublicUser } from '@repo/types';
import { Request, Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { CsrfGuard } from '../guards/csrf.guard';

// Add these helper functions at the top of the file, before the describe block
const createMockRequest = (cookies: Record<string, string> = {}) => {
  return {
    cookies,
    signedCookies: {},
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
    // Add other required properties as needed
  } as unknown as Request;
};

const createMockRequestWithUser = (
  cookies: Record<string, string> = {},
  user: PublicUser,
) => {
  return {
    cookies,
    signedCookies: {},
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
    user,
    // Add other required properties as needed
  } as unknown as Request & { user: PublicUser };
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockCookieService: jest.Mocked<CookieService>;
  let mockCsrfProvider: jest.Mocked<any>;
  let mockLoggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Create mock implementations
    mockAuthService = {
      signup: jest.fn(),
      signin: jest.fn(),
      signout: jest.fn(),
      renewAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    mockCookieService = {
      getOrCreateDeviceId: jest.fn(),
      clearAuthCookies: jest.fn(),
      generateDeviceId: jest.fn(),
      setAuthCookies: jest.fn(),
      isProd: false,
      isDev: true,
      setDeviceIdCookie: jest.fn(),
    } as unknown as jest.Mocked<CookieService>;

    mockCsrfProvider = {
      generateToken: jest.fn().mockReturnValue('mock-csrf-token'),
    };

    mockLoggerService = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      setContext: jest.fn(),
      forContext: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }])],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: CookieService,
          useValue: mockCookieService,
        },
        {
          provide: 'CSRF_PROVIDER',
          useValue: mockCsrfProvider,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        CsrfGuard,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('generateCsrfToken', () => {
    it('should call csrfProvider.generateToken with request and response', () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      controller.generateCsrfToken(mockReq, mockRes);

      expect(mockCsrfProvider.generateToken).toHaveBeenCalledWith(
        mockReq,
        mockRes,
      );
    });

    it('should call cookieService.getOrCreateDeviceId with request and response', () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      controller.generateCsrfToken(mockReq, mockRes);

      expect(mockCookieService.getOrCreateDeviceId).toHaveBeenCalledWith(
        mockReq,
        mockRes,
      );
    });

    it('should return response with token and deviceId', () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const expectedToken = 'test-csrf-token';
      const expectedDeviceId = 'test-device-id';
      mockCsrfProvider.generateToken.mockReturnValue(expectedToken);
      mockCookieService.getOrCreateDeviceId.mockReturnValue(expectedDeviceId);

      controller.generateCsrfToken(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        token: expectedToken,
        deviceId: expectedDeviceId,
      });
    });
  });

  describe('signup', () => {
    it('should throw BadRequestException when deviceId cookie is missing', async () => {
      const mockReq = createMockRequest();
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await expect(
        controller.signup(createUserDto, mockReq, mockRes),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call authService.signup and set auth cookies', async () => {
      const mockReq = createMockRequest({ deviceId: 'test-device-id' });
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      };
      mockAuthService.signup.mockResolvedValue([mockUser, mockTokens]);

      await controller.signup(createUserDto, mockReq, mockRes);

      expect(mockAuthService.signup).toHaveBeenCalledWith(
        createUserDto,
        'test-device-id',
      );
      expect(mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        mockRes,
        mockTokens.accessToken,
        mockTokens.refreshToken,
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('signin', () => {
    it('should throw BadRequestException when deviceId cookie is missing', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockReq = createMockRequestWithUser({}, mockUser);
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await expect(controller.signin(mockReq, mockRes)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call authService.signin and set auth cookies', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      };
      mockAuthService.signin.mockResolvedValue([mockUser, mockTokens]);

      await controller.signin(mockReq, mockRes);

      expect(mockAuthService.signin).toHaveBeenCalledWith(
        mockUser,
        'test-device-id',
      );
      expect(mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        mockRes,
        mockTokens.accessToken,
        mockTokens.refreshToken,
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('signout', () => {
    it('should call authService.signout with user and deviceId', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.signout(mockReq, mockRes);

      expect(mockAuthService.signout).toHaveBeenCalledWith(
        mockUser,
        'test-device-id',
      );
    });

    it('should call cookieService.clearAuthCookies with response', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.signout(mockReq, mockRes);

      expect(mockCookieService.clearAuthCookies).toHaveBeenCalledWith(mockRes);
    });

    it('should return JSON response with success message', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.signout(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully signed out',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens and set new auth cookies', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockReq = createMockRequestWithUser({}, mockUser);
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.renewAccessToken.mockResolvedValue([
        mockUser,
        mockTokens,
      ]);

      await controller.refreshToken(mockReq, mockRes);

      expect(mockAuthService.renewAccessToken).toHaveBeenCalledWith(mockUser);
      expect(mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        mockRes,
        mockTokens.accessToken,
        mockTokens.refreshToken,
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });
  });
});
