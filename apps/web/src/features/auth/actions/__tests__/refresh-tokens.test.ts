// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { refreshTokens } from '@/features/auth/actions/refresh-tokens';
import { getAuthHeaders } from '@/features/auth/actions/get-auth-headers';
import {
  getSessionOptions,
  sessionOptions,
} from '@/features/auth/config/session.config';
import { post } from '@/lib/request';
import { parseAndSetCookies } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { ErrorCode, PublicUser, SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
import { jwtDecode } from 'jwt-decode';
import { cookies, headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';

// Mock dependencies
jest.mock('@/features/auth/actions/get-auth-headers', () => ({
  getAuthHeaders: jest.fn(),
}));

jest.mock('@/features/auth/config/session.config', () => ({
  sessionOptions: {
    cookieName: 'test-session',
    password: 'test-password-that-is-at-least-32-chars',
  },
  getSessionOptions: jest.fn().mockReturnValue({
    cookieName: 'test-session',
    password: 'test-password-that-is-at-least-32-chars',
    ttl: 3600,
  }),
}));

jest.mock('@/features/auth/utils/cookies', () => ({
  parseAndSetCookies: jest.fn(),
}));

describe('refreshTokens', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should refresh tokens successfully and update session', async () => {
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

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock session with save and updateConfig methods
    const mockSession = {
      user: mockUser,
      isAuthenticated: true,
      expiresSoon: false,
      expiresAt: 0,
      refreshToken: 'old-refresh-token',
      save: jest.fn().mockResolvedValue(undefined),
      updateConfig: jest.fn(),
    };
    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    // Mock successful response from API
    const updatedUser: PublicUser = {
      ...mockUser,
      name: 'Updated User Name',
    };
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue('set-cookie-header'),
    };
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: updatedUser,
      headers: mockResponseHeaders,
    });

    // Mock tokens in cookie response
    const mockAccessToken = 'new-access-token';
    const mockRefreshToken = 'new-refresh-token';
    (parseAndSetCookies as jest.Mock).mockReturnValue({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
    });

    // Mock JWT decode
    const expiresIn30Minutes = Date.now() / 1000 + 30 * 60; // 30 minutes from now in seconds
    (jwtDecode as jest.Mock).mockReturnValue({
      sub: 'user-123',
      exp: expiresIn30Minutes,
    });

    // Act
    const result = await refreshTokens();

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(cookies).toHaveBeenCalled();
    expect(getIronSession).toHaveBeenCalledWith(
      expect.anything(),
      sessionOptions,
    );
    expect(getAuthHeaders).toHaveBeenCalledWith({ isRefresh: true });
    expect(post).toHaveBeenCalledWith('/auth/refresh', mockUser, {
      headers: mockAuthHeaders,
    });
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');
    expect(parseAndSetCookies).toHaveBeenCalledWith(
      expect.anything(),
      'set-cookie-header',
    );
    expect(jwtDecode).toHaveBeenCalledWith(mockAccessToken);

    // Session should be updated properly
    expect(getSessionOptions).toHaveBeenCalledWith(1800); // 30 minutes in seconds
    expect(mockSession.updateConfig).toHaveBeenCalled();
    expect(mockSession.user).toEqual(updatedUser);
    expect(mockSession.isAuthenticated).toBe(true);
    expect(mockSession.expiresSoon).toBe(false); // 30 minutes is not "soon"
    expect(mockSession.expiresAt).toBe(expiresIn30Minutes * 1000);
    expect(mockSession.refreshToken).toBe(mockRefreshToken);
    expect(mockSession.save).toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      data: updatedUser,
    });
  });

  it('should mark session as expiring soon when token expires in less than 5 minutes', async () => {
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

    // Mock session
    const mockSession = {
      user: mockUser,
      isAuthenticated: true,
      expiresSoon: false,
      expiresAt: 0,
      refreshToken: 'old-refresh-token',
      save: jest.fn().mockResolvedValue(undefined),
      updateConfig: jest.fn(),
    };
    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    (getAuthHeaders as jest.Mock).mockResolvedValue({});

    // Mock successful response from API
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue('set-cookie-header'),
    };
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      headers: mockResponseHeaders,
    });

    // Mock tokens in cookie response
    const mockAccessToken = 'new-access-token';
    const mockRefreshToken = 'new-refresh-token';
    (parseAndSetCookies as jest.Mock).mockReturnValue({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
    });

    // Mock JWT decode - expires in 3 minutes (less than 5)
    const expiresIn3Minutes = Date.now() / 1000 + 3 * 60;
    (jwtDecode as jest.Mock).mockReturnValue({
      sub: 'user-123',
      exp: expiresIn3Minutes,
    });

    // Act
    const result = await refreshTokens();

    // Assert
    expect(mockSession.expiresSoon).toBe(true); // Should be marked as expiring soon
    expect(mockSession.expiresAt).toBe(expiresIn3Minutes * 1000);
    expect(result.success).toBe(true);
  });

  it('should handle null session object', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Force null session - this should trigger the !session check
    // Use mockImplementation to ensure we get null
    (getIronSession as jest.Mock).mockImplementation(() => null);

    // Act
    const result = await refreshTokens();

    // Assert
    expect(result.success).toBe(false);
  });

  it('should return error when no session user exists', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock session with no user property
    // This will trigger the user check, not the session check
    const mockSession = {
      // user is undefined
    };
    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await refreshTokens();

    // Assert
    // In the actual code, this would trigger an error at some point
    expect(result.success).toBe(false);
  });

  it('should return API error when refresh request fails', async () => {
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

    // Mock session
    const mockSession = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'old-refresh-token',
    };
    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    const mockAuthHeaders = {
      'x-csrf-token': 'test-csrf-token',
      Cookie: 'cookie=value',
    };
    (getAuthHeaders as jest.Mock).mockResolvedValue(mockAuthHeaders);

    // Mock API error response
    const mockApiError = {
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Invalid refresh token',
        requestId: mockRequestId,
      },
    };
    (post as jest.Mock).mockResolvedValue(mockApiError);

    // Act
    const result = await refreshTokens();

    // Assert
    expect(post).toHaveBeenCalledWith('/auth/refresh', mockUser, {
      headers: mockAuthHeaders,
    });
    expect(result).toEqual(mockApiError);
  });

  it('should return error when tokens are missing from response', async () => {
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

    // Mock session
    const mockSession = {
      user: mockUser,
      isAuthenticated: true,
      refreshToken: 'old-refresh-token',
      save: jest.fn().mockResolvedValue(undefined),
      updateConfig: jest.fn(),
    };
    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    (getAuthHeaders as jest.Mock).mockResolvedValue({});

    // Mock successful response from API
    const mockResponseHeaders = {
      get: jest.fn().mockReturnValue('set-cookie-header'),
    };
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      headers: mockResponseHeaders,
    });

    // Mock missing tokens in cookie response
    (parseAndSetCookies as jest.Mock).mockReturnValue({
      // No access token and refresh token
      otherCookie: 'some-value',
    });

    // Act
    const result = await refreshTokens();

    // Assert
    expect(result.success).toBe(false);
  });

  it('should handle unexpected errors during token refresh', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    // Mock error during getIronSession
    const mockError = new Error('Session error');
    (getIronSession as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await refreshTokens();

    // Assert
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
    expect(result.success).toBe(false);
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null), // No request ID
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Force null session to trigger an error path
    (getIronSession as jest.Mock).mockImplementation(() => null);

    // Act
    const result = await refreshTokens();
    if (result.success) fail('Expected error response');

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    // We don't test specific error details, just that the UUID was used
    expect(result.success).toBe(false);
    expect(result.error.requestId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });
});
