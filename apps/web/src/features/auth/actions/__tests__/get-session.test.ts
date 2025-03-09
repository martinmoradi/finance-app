import { getSession } from '@/features/auth/actions/get-session';
import { sessionOptions } from '@/features/auth/config/session.config';
import { SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('@/features/auth/config/session.config', () => ({
  sessionOptions: {
    cookieName: 'test-session',
    password: 'test-password-at-least-32-characters',
  },
}));

jest.mock('iron-session', () => ({
  getIronSession: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock Date.now() for consistent testing of time-based logic
const mockNow = 1620000000000; // Fixed timestamp for testing
const realDateNow = Date.now.bind(global.Date);

describe('getSession', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Date.now
    global.Date.now = jest.fn(() => mockNow);

    // Setup basic cookie store mock
    const mockCookieStore = {};
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  // Restore original Date.now after tests
  afterAll(() => {
    global.Date.now = realDateNow;
  });

  it('should return unauthenticated session when isAuthenticated is false', async () => {
    // Arrange
    const mockSession: SessionData = {
      isAuthenticated: false,
      user: null,
      refreshToken: '',
    };

    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await getSession();

    // Assert
    expect(cookies).toHaveBeenCalled();
    expect(getIronSession).toHaveBeenCalledWith(
      expect.anything(),
      sessionOptions,
    );
    expect(result).toEqual({
      isAuthenticated: false,
    });
  });

  it('should return unauthenticated session when user is null', async () => {
    // Arrange
    const mockSession: SessionData = {
      isAuthenticated: true, // Despite being true, null user should override
      user: null,
      refreshToken: 'refresh-token-123',
    };

    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await getSession();

    // Assert
    expect(result).toEqual({
      isAuthenticated: false,
    });
  });

  it('should return authenticated session with expired flag when token is expired', async () => {
    // Arrange
    const expiredTimestamp = mockNow - 60000; // 1 minute in the past

    const mockSession: SessionData = {
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      refreshToken: 'refresh-token-123',
      expiresAt: expiredTimestamp,
    };

    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await getSession();

    // Assert
    expect(result).toEqual({
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      isExpired: true,
      expiresSoon: false, // Already expired
      refreshToken: 'refresh-token-123',
    });
  });

  it('should return authenticated session with expiresSoon flag when token expires soon', async () => {
    // Arrange
    const expiresInFourMinutes = mockNow + 4 * 60 * 1000; // 4 minutes in the future (less than 5 min)

    const mockSession: SessionData = {
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      refreshToken: 'refresh-token-123',
      expiresAt: expiresInFourMinutes,
    };

    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await getSession();

    // Assert
    expect(result).toEqual({
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      isExpired: false,
      expiresSoon: true, // Expires in less than 5 minutes
      refreshToken: 'refresh-token-123',
    });
  });

  it('should return authenticated session without flags when token does not expire soon', async () => {
    // Arrange
    const expiresInTenMinutes = mockNow + 10 * 60 * 1000; // 10 minutes in the future

    const mockSession: SessionData = {
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      refreshToken: 'refresh-token-123',
      expiresAt: expiresInTenMinutes,
    };

    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await getSession();

    // Assert
    expect(result).toEqual({
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      isExpired: false,
      expiresSoon: false,
      refreshToken: 'refresh-token-123',
    });
  });

  it('should handle session with no expiresAt value', async () => {
    // Arrange
    const mockSession: SessionData = {
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      refreshToken: 'refresh-token-123',
      // No expiresAt
    };

    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await getSession();

    // Assert
    expect(result).toEqual({
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      isExpired: false,
      expiresSoon: false, // Default to false when no expiresAt
      refreshToken: 'refresh-token-123',
    });
  });

  it('should use expiresSoon flag from session when no expiresAt is present', async () => {
    // Arrange
    const mockSession: SessionData = {
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      refreshToken: 'refresh-token-123',
      expiresSoon: true, // Explicitly set in session
      // No expiresAt
    };

    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Act
    const result = await getSession();

    // Assert
    expect(result).toEqual({
      isAuthenticated: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      isExpired: false,
      expiresSoon: true, // Should use value from session
      refreshToken: 'refresh-token-123',
    });
  });
});
