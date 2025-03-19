// Mock crypto.randomUUID at the top before imports
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

import { fetchCsrfToken } from '@/features/auth/actions/fetch-csrf';
import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { buildCookieHeader } from '@/features/auth/utils/cookies';
import { cookies, headers as nextHeaders } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/actions/fetch-csrf', () => ({
  fetchCsrfToken: jest.fn(),
}));

jest.mock('@/features/auth/utils/cookies', () => ({
  buildCookieHeader: jest.fn().mockReturnValue('cookie-header-string'),
}));

const originalEnv = process.env;

describe('getCsrfHeaders', () => {
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

  it('should return headers with existing CSRF token', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';
    const mockDeviceId = 'device-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Act
    const result = await getCsrfHeaders();

    // Assert
    expect(nextHeaders).toHaveBeenCalled();
    expect(mockHeadersObj.get).toHaveBeenCalledWith('x-request-id');
    expect(cookies).toHaveBeenCalled();
    expect(mockCookieStore.get).toHaveBeenCalledWith('__Host-csrf');
    expect(mockCookieStore.get).toHaveBeenCalledWith('deviceId');

    // Should not fetch a new token since one already exists
    expect(fetchCsrfToken).not.toHaveBeenCalled();

    expect(buildCookieHeader).toHaveBeenCalledWith({
      '__Host-csrf': mockCsrfValue,
      deviceId: mockDeviceId,
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

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          csrf: { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Act
    const result = await getCsrfHeaders();

    // Assert
    expect(mockCookieStore.get).toHaveBeenCalledWith('csrf');
    expect(buildCookieHeader).toHaveBeenCalledWith({
      csrf: mockCsrfValue,
      deviceId: mockDeviceId,
    });

    expect(result).toEqual({
      'x-request-id': mockRequestId,
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token123',
    });
  });

  it('should fetch a new CSRF token when none exists and return headers with it', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    // No CSRF cookie on first get, but after fetchCsrfToken it exists
    const mockCsrfValue = 'new-token123|data';
    const mockDeviceId = 'device-123';

    // Setup cookie store mock to return different values on subsequent calls
    let csrfCalls = 0;
    const mockCookieStore = {
      get: jest.fn((name) => {
        if (name === '__Host-csrf') {
          if (csrfCalls === 0) {
            csrfCalls++;
            return undefined; // First call returns undefined
          } else {
            return { value: mockCsrfValue }; // Subsequent calls return the token
          }
        } else if (name === 'deviceId') {
          return { value: mockDeviceId };
        }
        return undefined;
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock fetchCsrfToken to simulate setting the cookie
    (fetchCsrfToken as jest.Mock).mockResolvedValue({ success: true });

    // Act
    const result = await getCsrfHeaders();

    // Assert
    expect(fetchCsrfToken).toHaveBeenCalled();
    expect(mockCookieStore.get).toHaveBeenCalledTimes(4); // Called multiple times

    expect(buildCookieHeader).toHaveBeenCalledWith({
      '__Host-csrf': mockCsrfValue,
      deviceId: mockDeviceId,
    });

    expect(result).toEqual({
      'x-request-id': mockRequestId,
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'new-token123',
    });
  });

  it('should return empty object if no CSRF token can be fetched', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    // CSRF cookie never exists
    const mockCookieStore = {
      get: jest.fn().mockReturnValue(undefined),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock fetchCsrfToken to simulate failure or not setting the cookie
    (fetchCsrfToken as jest.Mock).mockResolvedValue({ success: false });

    // Act
    const result = await getCsrfHeaders();

    // Assert
    expect(fetchCsrfToken).toHaveBeenCalled();
    expect(mockCookieStore.get).toHaveBeenCalledWith('__Host-csrf');
    expect(result).toEqual({});
  });

  it('should use randomly generated UUID when request ID header is not present', async () => {
    // Arrange
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(null),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';
    const mockDeviceId = 'device-123';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          deviceId: { value: mockDeviceId },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Act
    const result = await getCsrfHeaders();

    // Assert
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(result).toEqual({
      'x-request-id': '123e4567-e89b-12d3-a456-426614174000',
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token123',
    });
  });

  it('should handle missing deviceId cookie gracefully', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    const mockCsrfValue = 'token123|data';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
          // No deviceId cookie
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Act
    const result = await getCsrfHeaders();

    // Assert
    expect(mockCookieStore.get).toHaveBeenCalledWith('deviceId');
    expect(buildCookieHeader).toHaveBeenCalledWith({
      '__Host-csrf': mockCsrfValue,
      // No deviceId included
    });

    expect(result).toEqual({
      'x-request-id': mockRequestId,
      Cookie: 'cookie-header-string',
      'x-csrf-token': 'token123',
    });
  });

  it('should handle URL-encoded CSRF token correctly', async () => {
    // Arrange
    const mockRequestId = 'test-request-id';
    const mockHeadersObj = {
      get: jest.fn().mockReturnValue(mockRequestId),
    };
    (nextHeaders as jest.Mock).mockResolvedValue(mockHeadersObj);

    // URL-encoded token
    const mockCsrfValue = 'token%7C123%7Cdata';

    const mockCookieStore = {
      get: jest.fn((name) => {
        const cookieMap: Record<string, { value: string }> = {
          '__Host-csrf': { value: mockCsrfValue },
        };
        return cookieMap[name];
      }),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Act
    const result = await getCsrfHeaders();

    // Assert
    expect(result['x-csrf-token']).toBe('token');
  });
});
