Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { fetchCsrfToken } from '@/features/auth/actions/fetch-csrf';
import { parseAndSetCookies } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { CsrfTokenResponse, ErrorCode } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { cookies, headers } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/utils/cookies', () => ({
  parseAndSetCookies: jest.fn().mockReturnValue({}),
}));

describe('fetchCsrfToken', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful response with CSRF token and set cookies', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const mockSetCookieHeader = 'csrf=token123; Path=/; HttpOnly';
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue(mockSetCookieHeader),
    };

    const mockCsrfTokenResponse: CsrfTokenResponse = {
      token: 'test-csrf-token',
    };

    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCsrfTokenResponse,
      headers: mockResponseHeaders,
    });

    // Act
    const result = await fetchCsrfToken();

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(post).toHaveBeenCalledWith('/auth/csrf-token', {});
    expect(cookies).toHaveBeenCalled();
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');
    expect(parseAndSetCookies).toHaveBeenCalledWith(
      mockCookieStore,
      mockSetCookieHeader,
    );
    expect(result).toEqual({
      success: true,
      data: mockCsrfTokenResponse,
    });
  });

  it('should return API error response when API call fails', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockApiError = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid request',
        requestId: mockRequestId,
      },
    };

    (post as jest.Mock).mockResolvedValue(mockApiError);

    // Act
    const result = await fetchCsrfToken();

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(post).toHaveBeenCalledWith('/auth/csrf-token', {});
    expect(cookies).not.toHaveBeenCalled();
    expect(parseAndSetCookies).not.toHaveBeenCalled();
    expect(result).toEqual(mockApiError);
  });

  it('should handle exceptions and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockError = new Error('Network error');
    (post as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await fetchCsrfToken();

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(post).toHaveBeenCalledWith('/auth/csrf-token', {});
    expect(Sentry.captureException).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          api_endpoint: '/auth/csrf-token',
          http_method: 'POST',
          error_type: 'Error',
        }),
        extra: expect.objectContaining({
          request_id: mockRequestId,
          message: 'Unexpected error in fetchCsrfToken',
        }),
      }),
    );
    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in fetchCsrfToken:',
      mockError,
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to fetch CSRF token',
      mockRequestId,
      { originalError: mockError },
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Failed to fetch CSRF token',
        requestId: mockRequestId,
        details: { originalError: mockError },
      },
    });
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const mockSetCookieHeader = 'csrf=token123; Path=/; HttpOnly';
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue(mockSetCookieHeader),
    };

    const mockCsrfTokenResponse: CsrfTokenResponse = {
      token: 'test-csrf-token',
    };

    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCsrfTokenResponse,
      headers: mockResponseHeaders,
    });

    // Act
    const result = await fetchCsrfToken();

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/csrf-token', {});
    expect(cookies).toHaveBeenCalled();
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');
    expect(parseAndSetCookies).toHaveBeenCalledWith(
      mockCookieStore,
      mockSetCookieHeader,
    );
    expect(result).toEqual({
      success: true,
      data: mockCsrfTokenResponse,
    });
  });

  it('should handle missing Set-Cookie header gracefully', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Response headers with no Set-Cookie header
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue(null),
    };

    const mockCsrfTokenResponse: CsrfTokenResponse = {
      token: 'test-csrf-token',
    };

    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCsrfTokenResponse,
      headers: mockResponseHeaders,
    });

    await expect(fetchCsrfToken()).resolves.toEqual({
      success: true,
      data: mockCsrfTokenResponse,
    });

    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(post).toHaveBeenCalledWith('/auth/csrf-token', {});
    expect(cookies).toHaveBeenCalled();
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');
    expect(parseAndSetCookies).toHaveBeenCalledWith(mockCookieStore, null);
  });
});
