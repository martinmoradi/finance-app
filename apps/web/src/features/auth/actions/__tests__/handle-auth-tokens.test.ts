// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { createSessionCookie } from '@/features/auth/actions/create-session-cookie';
import { handleAuthTokens } from '@/features/auth/actions/handle-auth-tokens';
import {
  parseCookiesFromHeader,
  ParsedCookie,
  setCookiesFromParsedData,
} from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { ErrorCode, PublicUser } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { cookies, headers } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/actions/create-session-cookie', () => ({
  createSessionCookie: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/auth/utils/cookies', () => ({
  parseCookiesFromHeader: jest.fn(),
  setCookiesFromParsedData: jest.fn().mockReturnValue({}),
}));

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn((code, message, requestId, details) => ({
    success: false,
    error: {
      code,
      message,
      requestId,
      details,
    },
  })),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

// Mock console.error to prevent logs during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('handleAuthTokens', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully handle auth tokens and create session cookie', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockAccessToken = 'test-access-token';
    const mockRefreshToken = 'test-refresh-token';
    const mockSetCookieHeaders = 'multiple-cookies-header-string';

    const mockParsedCookies: ParsedCookie[] = [
      {
        name: 'accessToken',
        value: mockAccessToken,
        options: { path: '/' },
      },
      {
        name: 'refreshToken',
        value: mockRefreshToken,
        options: { path: '/' },
      },
      {
        name: 'otherCookie',
        value: 'other-value',
        options: { path: '/' },
      },
    ];

    // Filter out refreshToken as the actual function would
    const expectedFilteredCookies = mockParsedCookies.filter(
      (cookie) => cookie.name !== 'refreshToken',
    );

    (parseCookiesFromHeader as jest.Mock).mockReturnValue(mockParsedCookies);

    // Act
    const result = await handleAuthTokens(mockSetCookieHeaders, mockUser);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(cookies).toHaveBeenCalled();
    expect(parseCookiesFromHeader).toHaveBeenCalledWith(mockSetCookieHeaders);
    expect(setCookiesFromParsedData).toHaveBeenCalledWith(
      mockCookieStore,
      expectedFilteredCookies,
    );
    expect(createSessionCookie).toHaveBeenCalledWith(
      mockUser,
      mockAccessToken,
      mockRefreshToken,
    );
    expect(result).toBeUndefined(); // Success case returns undefined
  });

  it('should return error when access token is missing', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    // No access token in parsed cookies
    const mockRefreshToken = 'test-refresh-token';
    const mockSetCookieHeaders = 'cookies-without-access-token';

    const mockParsedCookies: ParsedCookie[] = [
      // Missing accessToken
      {
        name: 'refreshToken',
        value: mockRefreshToken,
        options: { path: '/' },
      },
      {
        name: 'otherCookie',
        value: 'other-value',
        options: { path: '/' },
      },
    ];

    (parseCookiesFromHeader as jest.Mock).mockReturnValue(mockParsedCookies);

    // Act
    const result = await handleAuthTokens(mockSetCookieHeaders, mockUser);

    // Assert
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'HandleAuthTokens: No access token or refresh token found',
      expect.objectContaining({
        level: 'error',
        tags: {
          request_id: mockRequestId,
        },
        extra: {
          user: mockUser,
        },
      }),
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.UNKNOWN_ERROR,
      'No access token or refresh token found',
      mockRequestId,
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'No access token or refresh token found',
        requestId: mockRequestId,
      },
    });
  });

  it('should return error when refresh token is missing', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockAccessToken = 'test-access-token';
    // No refresh token
    const mockSetCookieHeaders = 'cookies-without-refresh-token';

    const mockParsedCookies: ParsedCookie[] = [
      {
        name: 'accessToken',
        value: mockAccessToken,
        options: { path: '/' },
      },
      // Missing refreshToken
      {
        name: 'otherCookie',
        value: 'other-value',
        options: { path: '/' },
      },
    ];

    (parseCookiesFromHeader as jest.Mock).mockReturnValue(mockParsedCookies);

    // Act
    const result = await handleAuthTokens(mockSetCookieHeaders, mockUser);

    // Assert
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'HandleAuthTokens: No access token or refresh token found',
      expect.objectContaining({
        level: 'error',
        tags: {
          request_id: mockRequestId,
        },
        extra: {
          user: mockUser,
        },
      }),
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.UNKNOWN_ERROR,
      'No access token or refresh token found',
      mockRequestId,
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'No access token or refresh token found',
        requestId: mockRequestId,
      },
    });
  });

  it('should handle exceptions gracefully', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSetCookieHeaders = 'valid-cookie-string';
    const mockError = new Error('Test error');

    // Make parseCookiesFromHeader throw an error
    (parseCookiesFromHeader as jest.Mock).mockImplementation(() => {
      throw mockError;
    });

    // Act
    const result = await handleAuthTokens(mockSetCookieHeaders, mockUser);

    // Assert
    expect(Sentry.captureException).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        level: 'error',
        tags: {
          error_type: 'Error',
        },
        extra: {
          request_id: mockRequestId,
          message: 'Unexpected error in handleAuthTokens',
        },
      }),
    );
    expect(console.error).toHaveBeenCalledWith(
      'Error handling auth tokens:',
      mockError,
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.UNKNOWN_ERROR,
      'Error handling auth tokens',
      mockRequestId,
      { originalError: mockError },
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Error handling auth tokens',
        requestId: mockRequestId,
        details: { originalError: mockError },
      },
    });
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null), // No request ID
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    // Force an error to test the UUID in the error response
    const mockSetCookieHeaders = 'valid-cookie-string';
    const mockParsedCookies: ParsedCookie[] = [
      // Only include other cookies to trigger the missing tokens error
      {
        name: 'otherCookie',
        value: 'other-value',
        options: { path: '/' },
      },
    ];

    (parseCookiesFromHeader as jest.Mock).mockReturnValue(mockParsedCookies);

    // Act
    const result = await handleAuthTokens(mockSetCookieHeaders, mockUser);

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'HandleAuthTokens: No access token or refresh token found',
      expect.objectContaining({
        tags: {
          request_id: '123e4567-e89b-12d3-a456-426614174000',
        },
      }),
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.UNKNOWN_ERROR,
      'No access token or refresh token found',
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'No access token or refresh token found',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      },
    });
  });
});
