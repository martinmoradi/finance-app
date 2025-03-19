import { getAuthHeaders } from '@/features/auth/actions/get-auth-headers';
import { getSession } from '@/features/auth/actions/get-session';
import { refreshTokens } from '@/features/auth/actions/refresh-tokens';
import { withAuth } from '@/features/auth/actions/with-auth';
import { createErrorResponse } from '@/lib/errors';
import { ErrorCode } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/actions/get-auth-headers', () => ({
  getAuthHeaders: jest.fn(),
}));

jest.mock('@/features/auth/actions/get-session', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/features/auth/actions/refresh-tokens', () => ({
  refreshTokens: jest.fn(),
}));

describe('withAuth', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the wrapped function with auth headers and session when authenticated', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    const mockAuthenticatedSession = {
      isAuthenticated: true,
      user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      isExpired: false,
      expiresSoon: false,
      refreshToken: 'refresh-token-123',
    };
    (getSession as jest.Mock).mockResolvedValue(mockAuthenticatedSession);

    // Create a mock server action that will be wrapped
    const mockServerAction = jest.fn().mockResolvedValue({
      success: true,
      data: { message: 'Action completed successfully' },
    });

    // Create test arguments
    const testArg1 = 'test-arg-1';
    const testArg2 = { key: 'value' };

    // Act
    const wrappedAction = withAuth(mockServerAction);
    const result = await wrappedAction(testArg1, testArg2);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(getAuthHeaders).toHaveBeenCalled();
    expect(getSession).toHaveBeenCalled();
    expect(refreshTokens).not.toHaveBeenCalled(); // Session not expired
    expect(mockServerAction).toHaveBeenCalledWith(
      mockAuthHeaders,
      mockAuthenticatedSession,
      testArg1,
      testArg2,
    );
    expect(result).toEqual({
      success: true,
      data: { message: 'Action completed successfully' },
    });
  });

  it('should refresh tokens if session is expired', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    const mockExpiredSession = {
      isAuthenticated: true,
      user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      isExpired: true, // Session is expired
      expiresSoon: false,
      refreshToken: 'refresh-token-123',
    };
    (getSession as jest.Mock).mockResolvedValue(mockExpiredSession);

    // Mock successful token refresh
    (refreshTokens as jest.Mock).mockResolvedValue({ success: true });

    // Create a mock server action that will be wrapped
    const mockServerAction = jest.fn().mockResolvedValue({
      success: true,
      data: { message: 'Action completed after refresh' },
    });

    // Act
    const wrappedAction = withAuth(mockServerAction);
    const result = await wrappedAction();

    // Assert
    expect(refreshTokens).toHaveBeenCalled(); // Should attempt to refresh tokens
    expect(mockServerAction).toHaveBeenCalledWith(
      mockAuthHeaders,
      mockExpiredSession,
    );
    expect(result).toEqual({
      success: true,
      data: { message: 'Action completed after refresh' },
    });
  });

  it('should return authentication error when session is not authenticated', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    // Unauthenticated session
    const mockUnauthenticatedSession = {
      isAuthenticated: false,
    };
    (getSession as jest.Mock).mockResolvedValue(mockUnauthenticatedSession);

    // Create a mock server action that will be wrapped
    const mockServerAction = jest.fn().mockResolvedValue({
      success: true,
      data: { message: 'Should not be called' },
    });

    // Act
    const wrappedAction = withAuth(mockServerAction);
    const result = await wrappedAction();

    // Assert
    expect(getSession).toHaveBeenCalled();
    expect(refreshTokens).not.toHaveBeenCalled();
    expect(mockServerAction).not.toHaveBeenCalled(); // Should not call the action
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

  it('should handle exceptions from the wrapped function', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    const mockAuthenticatedSession = {
      isAuthenticated: true,
      user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      isExpired: false,
      expiresSoon: false,
      refreshToken: 'refresh-token-123',
    };
    (getSession as jest.Mock).mockResolvedValue(mockAuthenticatedSession);

    // Create a mock server action that throws an error
    const mockError = new Error('Action failed');
    const mockServerAction = jest.fn().mockRejectedValue(mockError);

    // Act
    const wrappedAction = withAuth(mockServerAction);
    const result = await wrappedAction();

    // Assert
    expect(mockServerAction).toHaveBeenCalled(); // The action is called
    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in authenticated server action:',
      mockError,
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
          message: 'Unexpected error in withAuth',
        }),
      }),
    );
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred',
      mockRequestId,
      { originalError: mockError },
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: 'An unexpected error occurred',
        requestId: mockRequestId,
        details: { originalError: mockError },
      },
    });
  });

  it('should handle exceptions from the authentication process', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    // Make getAuthHeaders throw an error
    const mockError = new Error('Auth headers error');
    (getAuthHeaders as jest.Mock).mockRejectedValue(mockError);

    // Create a mock server action
    const mockServerAction = jest.fn().mockResolvedValue({
      success: true,
      data: { message: 'Should not be called' },
    });

    // Act
    const wrappedAction = withAuth(mockServerAction);
    const result = await wrappedAction();

    // Assert
    expect(getAuthHeaders).toHaveBeenCalled();
    expect(mockServerAction).not.toHaveBeenCalled(); // Should not be called after error
    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in authenticated server action:',
      mockError,
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
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred',
      mockRequestId,
      { originalError: mockError },
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: 'An unexpected error occurred',
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

    // Setup auth headers to return normally (not throw)
    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    // Make getSession return unauthenticated to trigger the error flow
    (getSession as jest.Mock).mockResolvedValue({ isAuthenticated: false });

    // Create a mock server action
    const mockServerAction = jest.fn();

    // Act
    const wrappedAction = withAuth(mockServerAction);
    const result = await wrappedAction();

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.AUTHENTICATION_ERROR,
      'Unauthenticated',
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Unauthenticated',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      },
    });
  });

  it('should handle error from session token refresh', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    const mockExpiredSession = {
      isAuthenticated: true,
      user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      isExpired: true, // Session is expired
      expiresSoon: false,
      refreshToken: 'refresh-token-123',
    };
    (getSession as jest.Mock).mockResolvedValue(mockExpiredSession);

    // Mock refresh token failure
    const refreshError = new Error('Token refresh failed');
    (refreshTokens as jest.Mock).mockRejectedValue(refreshError);

    // Create a mock server action
    const mockServerAction = jest.fn();

    // Act
    const wrappedAction = withAuth(mockServerAction);
    const result = await wrappedAction();

    // Assert
    expect(refreshTokens).toHaveBeenCalled();
    expect(mockServerAction).not.toHaveBeenCalled(); // Should not be called after error
    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in authenticated server action:',
      refreshError,
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      refreshError,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          request_id: mockRequestId,
          error_type: 'Error',
        }),
      }),
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: 'An unexpected error occurred',
        requestId: mockRequestId,
        details: { originalError: refreshError },
      },
    });
  });
});
