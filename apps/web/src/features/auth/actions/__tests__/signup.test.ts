// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { signup } from '@/features/auth/actions/signup';
import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { handleAuthTokens } from '@/features/auth/actions/handle-auth-tokens';
import { createErrorResponse, formatZodErrors } from '@/lib/errors';
import { post } from '@/lib/request';
import { ErrorCode, PublicUser, SignupCredentials } from '@repo/types';
import { createUserSchema } from '@repo/validation';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';
import { ZodError } from 'zod';

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
  formatZodErrors: jest.fn((errors) => ({ name: ['Invalid name'] })),
}));

jest.mock('@/lib/request', () => ({
  post: jest.fn(),
}));

jest.mock('@repo/validation', () => ({
  createUserSchema: {
    safeParse: jest.fn(),
  },
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

describe('signup', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful response with user data when signup succeeds', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCredentials: SignupCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    };

    // Mock successful validation
    (createUserSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockCredentials,
    });

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

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

    // Mock handleAuthTokens to resolve successfully
    (handleAuthTokens as jest.Mock).mockResolvedValue(undefined);

    // Act
    const result = await signup(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(createUserSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signup', mockCredentials, {
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

  it('should return validation error when schema validation fails', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCredentials: SignupCredentials = {
      name: '', // Invalid name
      email: 'test@example.com',
      password: 'Password123!',
    };

    // Mock validation failure
    const mockZodError = new ZodError([]);
    (createUserSchema.safeParse as jest.Mock).mockReturnValue({
      success: false,
      error: mockZodError,
    });

    // Act
    const result = await signup(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(createUserSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
    expect(formatZodErrors).toHaveBeenCalledWith(mockZodError.errors);

    // API call should not be made when validation fails
    expect(getCsrfHeaders).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();

    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        validationErrors: { name: ['Invalid name'] },
      },
    });
  });

  it('should return API error when signup request fails', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCredentials: SignupCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    };

    // Mock successful validation
    (createUserSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockCredentials,
    });

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock API error
    const mockApiError = {
      success: false,
      error: {
        code: ErrorCode.CONFLICT,
        message: 'Email already in use',
        requestId: mockRequestId,
      },
    };
    (post as jest.Mock).mockResolvedValue(mockApiError);

    // Act
    const result = await signup(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(createUserSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signup', mockCredentials, {
      headers: mockCsrfHeaders,
    });

    // Auth tokens should not be handled when API returns error
    expect(handleAuthTokens).not.toHaveBeenCalled();

    expect(result).toEqual(mockApiError);
  });

  it('should handle errors from getCsrfHeaders and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCredentials: SignupCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    };

    // Mock successful validation
    (createUserSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockCredentials,
    });

    // Mock getCsrfHeaders to throw error
    const mockError = new Error('Failed to get CSRF headers');
    (getCsrfHeaders as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await signup(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(createUserSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
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
          message: 'Unexpected error in signupAction',
        }),
      }),
    );

    expect(console.error).toHaveBeenCalledWith(
      'Unexpected error in signupAction:',
      mockError,
    );

    expect(createErrorResponse).toHaveBeenCalledWith(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during signup',
      mockRequestId,
      { originalError: mockError },
    );

    if (result.success) fail('Expected error response');
    expect(result.error.code).toBe(ErrorCode.SERVER_ERROR);
  });

  it('should handle errors from post function and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCredentials: SignupCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    };

    // Mock successful validation
    (createUserSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockCredentials,
    });

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

    // Mock post to throw a network error
    const mockError = new Error('Network error');
    (post as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await signup(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(createUserSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signup', mockCredentials, {
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

  it('should handle missing Set-Cookie header and return error response', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCredentials: SignupCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    };

    // Mock successful validation
    (createUserSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockCredentials,
    });

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

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

    // Mock handleAuthTokens to throw error when null cookie is provided
    const mockError = new Error('Missing Set-Cookie header');
    (handleAuthTokens as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await signup(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(createUserSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signup', mockCredentials, {
      headers: mockCsrfHeaders,
    });
    expect(mockResponseHeaders.get).toHaveBeenCalledWith('Set-Cookie');

    // The function should catch the error from handleAuthTokens
    if (result.success) fail('Expected error response');
    expect(result.error.code).toBe(ErrorCode.SERVER_ERROR);
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCredentials: SignupCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    };

    // Mock successful validation
    (createUserSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockCredentials,
    });

    const mockCsrfHeaders = {
      'x-csrf-token': 'test-csrf-token',
    };
    (getCsrfHeaders as jest.Mock).mockResolvedValue(mockCsrfHeaders);

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

    // Ensure handleAuthTokens resolves successfully
    (handleAuthTokens as jest.Mock).mockResolvedValue(undefined);

    // Act
    const result = await signup(mockCredentials);

    // Assert
    expect(headers).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(createUserSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
    expect(getCsrfHeaders).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/auth/signup', mockCredentials, {
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
