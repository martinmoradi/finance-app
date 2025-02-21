import { CookieService } from '@/cookie/cookie.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRequiredEnvVar } from '@repo/env-validation';
import * as crypto from 'crypto';
import { Request, Response } from 'express';

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

// Mock environment variables
jest.mock('@repo/env-validation', () => ({
  getRequiredEnvVar: jest.fn((key: string): string => {
    switch (key) {
      case 'NODE_ENV':
        return 'development';
      case 'JWT_EXPIRES_IN':
        return '15m';
      case 'REFRESH_TOKEN_EXPIRES_IN':
        return '7d';
      default:
        return 'dummy-value';
    }
  }),
}));

describe('CookieService', () => {
  let service: CookieService;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set default environment to development with proper JWT expiration values
    jest.mocked(getRequiredEnvVar).mockImplementation((key: string): string => {
      switch (key) {
        case 'NODE_ENV':
          return 'development';
        case 'JWT_EXPIRES_IN':
          return '15m';
        case 'REFRESH_TOKEN_EXPIRES_IN':
          return '7d';
        default:
          return 'dummy-value';
      }
    });

    // Create mock response object
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    // Create mock request object
    mockRequest = {
      cookies: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CookieService],
    }).compile();

    service = module.get<CookieService>(CookieService);
  });

  describe('generateDeviceId', () => {
    it('should generate a UUID', () => {
      const result = service.generateDeviceId();
      expect(result).toBe('mock-uuid');
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    });
  });

  describe('setDeviceIdCookie', () => {
    it('should set device ID cookie with correct options in development', () => {
      service.setDeviceIdCookie(mockResponse as Response, 'test-device-id');

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'deviceId',
        'test-device-id',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 365 * 24 * 60 * 60 * 1000,
        },
      );
    });

    it('should set device ID cookie with correct options in production', () => {
      jest.mocked(getRequiredEnvVar).mockReturnValue('production');

      service.setDeviceIdCookie(mockResponse as Response, 'test-device-id');

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'deviceId',
        'test-device-id',
        {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 365 * 24 * 60 * 60 * 1000,
        },
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear all auth cookies in development', () => {
      service.clearAuthCookies(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(4);

      // Device ID
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('deviceId', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });

      // CSRF
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('csrf', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });

      // Access Token
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('accessToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });

      // Refresh Token
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
    });

    it('should clear all auth cookies in production', () => {
      jest.mocked(getRequiredEnvVar).mockReturnValue('production');

      service.clearAuthCookies(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(4);

      // Device ID
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('deviceId', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      // CSRF
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('__Host-csrf', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      // Access Token
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('accessToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      // Refresh Token
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
    });
  });

  describe('setAuthCookies', () => {
    it('should set auth cookies with correct options in development', () => {
      service.setAuthCookies(
        mockResponse as Response,
        'test-access',
        'test-refresh',
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'test-access',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        }),
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'test-refresh',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/auth/refresh',
        }),
      );
    });

    it('should set auth cookies with correct options in production', () => {
      // Override only NODE_ENV, keep JWT expiration values
      jest
        .mocked(getRequiredEnvVar)
        .mockImplementation((key: string): string => {
          switch (key) {
            case 'NODE_ENV':
              return 'production';
            case 'JWT_EXPIRES_IN':
              return '15m';
            case 'REFRESH_TOKEN_EXPIRES_IN':
              return '7d';
            default:
              return 'dummy-value';
          }
        });

      service.setAuthCookies(
        mockResponse as Response,
        'test-access',
        'test-refresh',
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'test-access',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        }),
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'test-refresh',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/auth/refresh',
        }),
      );
    });
  });

  describe('getOrCreateDeviceId', () => {
    it('should return existing deviceId if present in cookies', () => {
      mockRequest.cookies = { deviceId: 'existing-device-id' };

      const result = service.getOrCreateDeviceId(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(result).toBe('existing-device-id');
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should generate and set new deviceId if not present in cookies', () => {
      const result = service.getOrCreateDeviceId(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(result).toBe('mock-uuid');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'deviceId',
        'mock-uuid',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 365 * 24 * 60 * 60 * 1000,
        },
      );
    });
  });

  describe('extractTokenFromCookie', () => {
    it('should return null if request is undefined', () => {
      const result = service.extractTokenFromCookie(
        undefined as any,
        'accessToken',
      );
      expect(result).toBeNull();
    });

    it('should return null if cookies object is undefined', () => {
      const reqWithoutCookies = {} as any;
      const result = service.extractTokenFromCookie(
        reqWithoutCookies,
        'accessToken',
      );
      expect(result).toBeNull();
    });

    it('should return null if requested cookie is not present', () => {
      mockRequest.cookies = {};
      const result = service.extractTokenFromCookie(
        mockRequest as any,
        'accessToken',
      );
      expect(result).toBeNull();
    });

    it('should return the cookie value if present', () => {
      mockRequest.cookies = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        deviceId: 'test-device-id',
        csrf: 'test-csrf-token',
      };

      expect(
        service.extractTokenFromCookie(mockRequest as any, 'accessToken'),
      ).toBe('test-access-token');
      expect(
        service.extractTokenFromCookie(mockRequest as any, 'refreshToken'),
      ).toBe('test-refresh-token');
      expect(
        service.extractTokenFromCookie(mockRequest as any, 'deviceId'),
      ).toBe('test-device-id');
      expect(service.extractTokenFromCookie(mockRequest as any, 'csrf')).toBe(
        'test-csrf-token',
      );
    });

    it('should handle __Host-csrf token in production', () => {
      mockRequest.cookies = {
        '__Host-csrf': 'test-host-csrf-token',
      };

      const result = service.extractTokenFromCookie(
        mockRequest as any,
        '__Host-csrf',
      );
      expect(result).toBe('test-host-csrf-token');
    });
  });
});
