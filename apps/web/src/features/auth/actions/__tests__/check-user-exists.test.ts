// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { checkUserExists } from '@/features/auth/actions/check-user-exists';
import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { ErrorCode } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/actions/get-csrf-headers', () => ({
  getCsrfHeaders: jest.fn(),
}));

describe('checkUserExists', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when user exists', async () => {
    // Arrange
    const mockEmail = 'exists@example.com';
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock successful API response with true (user exists)
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: true,
    });

    // Act
    const result = await checkUserExists(mockEmail);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith(
      '/user/exists',
      { email: mockEmail },
      {
        headers: mockCsrfHeaders,
      },
    );

    expect(result).toEqual({
      success: true,
      data: true,
    });
  });

  it('should return false when user does not exist', async () => {
    // Arrange
    const mockEmail = 'notexists@example.com';
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock successful API response with false (user doesn't exist)
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: false,
    });

    // Act
    const result = await checkUserExists(mockEmail);

    // Assert
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith(
      '/user/exists',
      { email: mockEmail },
      {
        headers: mockCsrfHeaders,
      },
    );

    expect(result).toEqual({
      success: true,
      data: false,
    });
  });

  it('should return API error when request fails', async () => {
    // Arrange
    const mockEmail = 'test@example.com';
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock API error response
    const mockApiError = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid email format',
        requestId: mockRequestId,
      },
    };
    (post as jest.Mock).mockResolvedValue(mockApiError);

    // Act
    const result = await checkUserExists(mockEmail);

    // Assert
    expect(post).toHaveBeenCalledWith(
      '/user/exists',
      { email: mockEmail },
      {
        headers: mockCsrfHeaders,
      },
    );

    expect(result).toEqual(mockApiError);
  });

  it('should handle exceptions and return error response', async () => {
    // Arrange
    const mockEmail = 'test@example.com';
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock API request to throw an error
    const mockError = new Error('Network error');
    (post as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await checkUserExists(mockEmail);

    // Assert
    expect(post).toHaveBeenCalledWith(
      '/user/exists',
      { email: mockEmail },
      {
        headers: mockCsrfHeaders,
      },
    );

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
          message: 'Unexpected error in checkUserExistsAction',
        }),
      }),
    );

    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in checkUserExistsAction:',
      mockError,
    );

    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during checkUserExists',
      mockRequestId,
      { originalError: mockError },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ErrorCode.SERVER_ERROR);
    }
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockEmail = 'test@example.com';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null), // No request ID
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock successful API response
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: true,
    });

    // Act
    const result = await checkUserExists(mockEmail);

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith(
      '/user/exists',
      { email: mockEmail },
      {
        headers: mockCsrfHeaders,
      },
    );

    expect(result).toEqual({
      success: true,
      data: true,
    });
  });

  it('should pass the correct data and headers to the API request', async () => {
    // Arrange
    const mockEmail = 'test@example.com';
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
      'Content-Type': 'application/json',
      cookie: 'auth=token123',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock successful API response
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: true,
    });

    // Act
    await checkUserExists(mockEmail);

    // Assert - checking that data and headers are passed correctly
    expect(post).toHaveBeenCalledWith(
      '/user/exists',
      { email: mockEmail },
      {
        headers: mockCsrfHeaders,
      },
    );
  });
});
