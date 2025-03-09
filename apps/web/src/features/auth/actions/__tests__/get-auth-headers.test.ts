// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { getAuthHeaders } from '@/features/auth/actions/get-auth-headers';
import { getSession } from '@/features/auth/actions/get-session';
import { buildCookieHeader } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { ErrorCode } from '@repo/types';
import { cookies, headers as nextHeaders } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/actions/get-session', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/features/auth/utils/cookies', () => ({
  buildCookieHeader: jest.fn().mockReturnValue('cookie-header-string'),
}));

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn((code, message, requestId) => ({
    success: false,
    error: {
      code,
      message,
      requestId,
    },
  })),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

const originalEnv = process.env;

describe('getAuthHeaders', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
    };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should return headers with all auth tokens for an authenticated session', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';
    const mockDeviceId = 'device-123';
    const mockAccessToken = 'access-token-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
          accessToken: { value: mockAccessToken },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: 'refresh-token-123',
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(nextHeaders).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(cookies).toHaveBeenCalled();
    expect(mockCookieStore.get).toHaveBeenCalledWith('__Host-csrf');
    expect(mockCookieStore.get).toHaveBeenCalledWith('deviceId');
    expect(mockCookieStore.get).toHaveBeenCalledWith('accessToken');
    expect(getSession).toHaveBeenCalled();

    expect(buildCookieHeader).toHaveBeenCalledWith({
      '__Host-csrf': mockCsrfValue,
      deviceId: mockDeviceId,
      accessToken: mockAccessToken,
    });

    expect(result).toEqual({
      'x-request-id': mockRequestId,
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token123',
    });
  });

  it('should use csrf cookie name based on environment (development)', async () => {
    // Arrange
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
    };

    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';
    const mockDeviceId = 'device-123';
    const mockAccessToken = 'access-token-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          csrf: { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
          accessToken: { value: mockAccessToken },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: 'refresh-token-123',
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(mockCookieStore.get).toHaveBeenCalledWith('csrf');
    expect(buildCookieHeader).toHaveBeenCalledWith({
      csrf: mockCsrfValue,
      deviceId: mockDeviceId,
      accessToken: mockAccessToken,
    });

    expect(result).toEqual({
      'x-request-id': mockRequestId,
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token123',
    });
  });

  it('should include refresh token when isRefresh is true', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';
    const mockDeviceId = 'device-123';
    const mockAccessToken = 'access-token-123';
    const mockRefreshToken = 'refresh-token-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
          accessToken: { value: mockAccessToken },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: mockRefreshToken,
    });

    // Act
    const result = await getAuthHeaders({ isRefresh: true });

    // Assert
    expect(buildCookieHeader).toHaveBeenCalledWith({
      '__Host-csrf': mockCsrfValue,
      deviceId: mockDeviceId,
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
    });

    expect(result).toEqual({
      'x-request-id': mockRequestId,
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token123',
    });
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';
    const mockDeviceId = 'device-123';
    const mockAccessToken = 'access-token-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
          accessToken: { value: mockAccessToken },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: 'refresh-token-123',
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(result).toEqual({
      'x-request-id': '123e4567-e89b-12d3-a456-426614174000',
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token123',
    });
  });

  it('should return error response when csrf cookie is missing', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          // No csrf cookie
          deviceId: { value: 'device-123' },
          accessToken: { value: 'access-token-123' },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: 'refresh-token-123',
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.AUTHENTICATION_ERROR,
      'Unauthenticated',
      mockRequestId,
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Unauthenticated',
        requestId: mockRequestId,
      },
    });
  });

  it('should return error response when deviceId cookie is missing', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: 'token123|data' },
          // No deviceId cookie
          accessToken: { value: 'access-token-123' },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: 'refresh-token-123',
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.AUTHENTICATION_ERROR,
      'Unauthenticated',
      mockRequestId,
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Unauthenticated',
        requestId: mockRequestId,
      },
    });
  });

  it('should return error response when accessToken cookie is missing', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: 'token123|data' },
          deviceId: { value: 'device-123' },
          // No accessToken cookie
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: 'refresh-token-123',
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.AUTHENTICATION_ERROR,
      'Unauthenticated',
      mockRequestId,
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Unauthenticated',
        requestId: mockRequestId,
      },
    });
  });

  it('should return error response when session is not authenticated', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';
    const mockDeviceId = 'device-123';
    const mockAccessToken = 'access-token-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
          accessToken: { value: mockAccessToken },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Session is not authenticated
    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: false,
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.AUTHENTICATION_ERROR,
      'Unauthenticated',
      mockRequestId,
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Unauthenticated',
        requestId: mockRequestId,
      },
    });
  });

  it('should handle csrf token extraction correctly', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    // Test with URL-encoded token
    const mockCsrfValue = 'token%7C123%7Cdata';
    const mockDeviceId = 'device-123';
    const mockAccessToken = 'access-token-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
          accessToken: { value: mockAccessToken },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    (getSession as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      refreshToken: 'refresh-token-123',
    });

    // Act
    const result = await getAuthHeaders();

    // Assert
    expect(result).toEqual({
      'x-request-id': mockRequestId,
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token',
    });
  });
});
