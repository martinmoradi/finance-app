// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { signin } from '@/features/auth/actions/signin';
import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { handleAuthTokens } from '@/features/auth/actions/handle-auth-tokens';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { ErrorCode, PublicUser, SigninCredentials } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/actions/get-csrf-headers', () => ({
  getCsrfHeaders: jest.fn(),
}));

jest.mock('@/features/auth/actions/handle-auth-tokens', () => ({
  handleAuthTokens: jest.fn(),
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

jest.mock('@/lib/request', () => ({
  post: jest.fn(),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

jest.mock('next/headers', () => ({
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

describe('signin', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful response with user data when signin succeeds', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    const mockCredentials: SigninCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSetCookieHeader = 'auth=token123; Path=/; HttpOnly';
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue(mockSetCookieHeader),
    };

    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      headers: mockResponseHeaders,
    });

    // Act
    const result = await signin(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signin', mockCredentials, {
      headers: mockCsrfHeaders,
    });
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');
    expect(handleAuthTokens).toHaveBeenCalledWith(
      mockSetCookieHeader,
      mockUser,
    );
    expect(result).toEqual({
      success: true,
      data: mockUser,
    });
  });

  it('should return API error response when API call fails', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    const mockCredentials: SigninCredentials = {
      email: 'test@example.com',
      password: 'wrong-password',
    };

    const mockApiError = {
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Invalid credentials',
        requestId: mockRequestId,
      },
    };

    (post as jest.Mock).mockResolvedValue(mockApiError);

    // Act
    const result = await signin(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signin', mockCredentials, {
      headers: mockCsrfHeaders,
    });
    expect(handleAuthTokens).not.toHaveBeenCalled();
    expect(result).toEqual(mockApiError);
  });

  it('should handle exceptions from getCsrfHeaders and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockError = new Error('Failed to get CSRF headers');
    (getCsrfHeaders as jest.Mock).mockRejectedValue(mockError);

    const mockCredentials: SigninCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    // Act
    const result = await signin(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          request_id: mockRequestId,
          error_type: 'Error',
        }),
        extra: expect.objectContaining({
          request_id: mockRequestId,
          message: 'Unexpected error in signinAction',
        }),
      }),
    );
    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in signinAction:',
      mockError,
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during signin',
      mockRequestId,
      { originalError: mockError },
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: 'An unexpected error occurred during signin',
        requestId: mockRequestId,
        details: { originalError: mockError },
      },
    });
  });

  it('should handle errors from post function and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    const mockCredentials: SigninCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    // Mock post to throw a network error
    const mockError = new Error('Network error');
    (post as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await signin(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signin', mockCredentials, {
      headers: mockCsrfHeaders,
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          request_id: mockRequestId,
          error_type: 'Error',
        }),
      }),
    );

    if (result.success) fail('Expected error response');
    expect(result.error.code).toBe(ErrorCode.SERVER_ERROR);
  });

  it('should handle errors from handleAuthTokens and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    const mockCredentials: SigninCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSetCookieHeader = 'auth=token123; Path=/; HttpOnly';
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue(mockSetCookieHeader),
    };

    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      headers: mockResponseHeaders,
    });

    // Mock handleAuthTokens to throw an error
    const mockError = new Error('Failed to handle auth tokens');
    (handleAuthTokens as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await signin(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signin', mockCredentials, {
      headers: mockCsrfHeaders,
    });
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');
    expect(handleAuthTokens).toHaveBeenCalledWith(
      mockSetCookieHeader,
      mockUser,
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          request_id: mockRequestId,
          error_type: 'Error',
        }),
      }),
    );

    if (result.success) fail('Expected error response');
    expect(result.error.code).toBe(ErrorCode.SERVER_ERROR);
  });

  it('should handle missing Set-Cookie header and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    const mockCredentials: SigninCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    // Response headers with no Set-Cookie header
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue(null),
    };

    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      headers: mockResponseHeaders,
    });

    // Act
    const result = await signin(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signin', mockCredentials, {
      headers: mockCsrfHeaders,
    });
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');

    // The function should catch the error and return an error response
    if (result.success) fail('Expected error response');
    expect(result.error.code).toBe(ErrorCode.SERVER_ERROR);
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    const mockCredentials: SigninCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSetCookieHeader = 'auth=token123; Path=/; HttpOnly';
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue(mockSetCookieHeader),
    };

    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      headers: mockResponseHeaders,
    });

    // Ensure handleAuthTokens resolves successfully for this test
    (handleAuthTokens as jest.Mock).mockResolvedValue(undefined);

    // Act
    const result = await signin(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signin', mockCredentials, {
      headers: mockCsrfHeaders,
    });
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');
    expect(handleAuthTokens).toHaveBeenCalledWith(
      mockSetCookieHeader,
      mockUser,
    );
    expect(result).toEqual({
      success: true,
      data: mockUser,
    });
  });
});
