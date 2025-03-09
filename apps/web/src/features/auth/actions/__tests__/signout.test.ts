// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { signout } from '@/features/auth/actions/signout';
import { sessionOptions } from '@/features/auth/config/session.config';
import { withAuth } from '@/features/auth/actions/with-auth';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { ErrorCode, PublicUser, SessionData } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

// Mock withAuth to expose the wrapped function for testing
jest.mock('@/features/auth/actions/with-auth', () => ({
  withAuth: jest.fn((fn) => fn),
}));

jest.mock('@/features/auth/config/session.config', () => ({
  sessionOptions: {
    cookieName: 'test-session',
    password: 'test-password-that-is-at-least-32-chars',
  },
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

jest.mock('iron-session', () => ({
  getIronSession: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

// Mock console.error to prevent logs during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('signout', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully sign out the user', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSession: SessionData = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'test-refresh-token',
    };

    // Mock successful API response
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: undefined,
    });

    // Mock cookies
    const mockCookieDelete = jest.fn();
    const mockCookieGetAll = jest
      .fn()
      .mockReturnValue([{ name: 'cookie1' }, { name: 'cookie2' }]);
    const mockCookieStore = {
      delete: mockCookieDelete,
      getAll: mockCookieGetAll,
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock session
    const mockIronSession = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'test-refresh-token',
      destroy: jest.fn(),
    };
    (getIronSession as jest.Mock).mockResolvedValue(mockIronSession);

    // Act
    const result = await signout(mockHeaders, mockSession);

    // Assert
    expect(post).toHaveBeenCalledWith('/auth/signout', mockUser, {
      headers: mockHeaders,
    });
    expect(cookies).toHaveBeenCalled();
    expect(getIronSession).toHaveBeenCalledWith(
      mockCookieStore,
      sessionOptions,
    );

    // Check session was cleared
    expect(mockIronSession.user).toBeNull();
    expect(mockIronSession.isAuthenticated).toBe(false);
    expect(mockIronSession.refreshToken).toBe('');
    expect(mockIronSession.destroy).toHaveBeenCalled();

    // Check cookies were deleted
    expect(mockCookieGetAll).toHaveBeenCalled();
    expect(mockCookieDelete).toHaveBeenCalledTimes(2);
    expect(mockCookieDelete).toHaveBeenCalledWith('cookie1');
    expect(mockCookieDelete).toHaveBeenCalledWith('cookie2');

    // Check result
    expect(result).toEqual({
      success: true,
      data: undefined,
    });
  });

  it('should return API error when signout request fails', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSession: SessionData = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'test-refresh-token',
    };

    // Mock API error response
    const mockApiError = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: 'Failed to signout on server',
        requestId: mockRequestId,
      },
    };
    (post as jest.Mock).mockResolvedValue(mockApiError);

    // Act
    const result = await signout(mockHeaders, mockSession);

    // Assert
    expect(post).toHaveBeenCalledWith('/auth/signout', mockUser, {
      headers: mockHeaders,
    });

    // Session should not be modified when API fails
    expect(cookies).not.toHaveBeenCalled();
    expect(getIronSession).not.toHaveBeenCalled();

    // Check result
    expect(result).toEqual(mockApiError);
  });

  it('should handle exceptions and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSession: SessionData = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'test-refresh-token',
    };

    // Mock post to throw error
    const mockError = new Error('Network error');
    (post as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await signout(mockHeaders, mockSession);

    // Assert
    expect(post).toHaveBeenCalledWith('/auth/signout', mockUser, {
      headers: mockHeaders,
    });

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
          message: 'Unexpected error in signoutAction',
        }),
      }),
    );

    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in signoutAction:',
      mockError,
    );

    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to signout',
      mockRequestId,
      { originalError: mockError },
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Failed to signout',
        requestId: mockRequestId,
        details: { originalError: mockError },
      },
    });
  });

  it('should handle exceptions during session cleanup', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeaders = {
      'x-request-id': mockRequestId,
      'x-csrf-token': 'test-csrf-token',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSession: SessionData = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'test-refresh-token',
    };

    // Mock successful API response
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: undefined,
    });

    // Mock cookies to throw error
    const mockError = new Error('Session error');
    (cookies as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await signout(mockHeaders, mockSession);

    // Assert
    expect(post).toHaveBeenCalledWith('/auth/signout', mockUser, {
      headers: mockHeaders,
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
    expect(result.error.code).toBe(ErrorCode.UNKNOWN_ERROR);
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeaders = {
      // No request ID
      'x-csrf-token': 'test-csrf-token',
    };

    const mockUser: PublicUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockSession: SessionData = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'test-refresh-token',
    };

    // Mock successful API response
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: undefined,
    });

    // Mock cookies
    const mockCookieDelete = jest.fn();
    const mockCookieGetAll = jest.fn().mockReturnValue([]);
    const mockCookieStore = {
      delete: mockCookieDelete,
      getAll: mockCookieGetAll,
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock session
    const mockIronSession = {
      destroy: jest.fn(),
    };
    (getIronSession as jest.Mock).mockResolvedValue(mockIronSession);

    // Act
    const result = await signout(mockHeaders, mockSession);

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signout', mockUser, {
      headers: mockHeaders,
    });

    expect(result.success).toBe(true);
  });
});
