// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { getMe } from '@/features/auth/actions/get-me';
import { withAuth } from '@/features/auth/actions/with-auth';
import { createErrorResponse } from '@/lib/errors';
import { get } from '@/lib/request';
import { ErrorCode, PublicUser } from '@repo/types';
import * as Sentry from '@sentry/nextjs';

// Mock withAuth to expose the wrapped function for testing
jest.mock('@/features/auth/actions/with-auth', () => ({
  withAuth: jest.fn((fn) => fn),
}));

describe('getMe', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user data when request is successful', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    // Mock successful API response
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
    });

    // Act
    const result = await getMe(mockHeaders);

    // Assert
    expect(get).toHaveBeenCalledWith('/auth/me', {
      headers: mockHeaders,
    });

    expect(result).toEqual({
      success: true,
      data: mockUser,
    });
  });

  it('should return API error when request fails', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };

    // Mock API error response
    const mockApiError = {
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'User not authenticated',
        requestId: mockRequestId,
      },
    };
    (get as jest.Mock).mockResolvedValue(mockApiError);

    // Act
    const result = await getMe(mockHeaders);

    // Assert
    expect(get).toHaveBeenCalledWith('/auth/me', {
      headers: mockHeaders,
    });

    expect(result).toEqual(mockApiError);
  });

  it('should handle exceptions and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };

    // Mock API request to throw an error
    const mockError = new Error('Network error');
    (get as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await getMe(mockHeaders);

    // Assert
    expect(get).toHaveBeenCalledWith('/auth/me', {
      headers: mockHeaders,
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          api_endpoint: '/auth/me',
          http_method: 'GET',
          error_type: 'Error',
        }),
        extra: expect.objectContaining({
          request_id: mockRequestId,
          message: 'Unexpected error in getMeAction',
        }),
      }),
    );

    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in getMeAction:',
      mockError,
    );

    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during getMe',
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
    const mockHeaders = {
      // No request ID
      'x-csrf-token': 'test-csrf-token',
      cookie: 'auth=token123',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    // Mock successful API response
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
    });

    // Act
    const result = await getMe(mockHeaders);

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('/auth/me', {
      headers: mockHeaders,
    });

    expect(result).toEqual({
      success: true,
      data: mockUser,
    });
  });

  it('should pass the correct headers to the API request', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
      Authorization: 'Bearer token123',
      Cookie: 'auth=token123',
      'Content-Type': 'application/json',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    // Mock successful API response
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
    });

    // Act
    await getMe(mockHeaders);

    // Assert - checking that headers are passed correctly
    expect(get).toHaveBeenCalledWith('/auth/me', {
      headers: mockHeaders,
    });
  });
});
