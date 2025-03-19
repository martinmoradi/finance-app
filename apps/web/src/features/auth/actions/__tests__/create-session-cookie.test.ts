import { createSessionCookie } from '@/features/auth/actions/create-session-cookie';
import { getSessionOptions } from '@/features/auth/config/session.config';
import { PublicUser } from '@repo/types';
import { getIronSession } from 'iron-session';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';

jest.mock('@/features/auth/config/session.config');

describe('createSessionCookie', () => {
  // Test data
  const user: PublicUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'user@example.com',
  };
  const jwt = 'valid.jwt.token';
  const refreshToken = 'refresh-token-123';

  // Mock timestamps to avoid time-based test flakiness
  const now = 1646735000000; // Fixed timestamp (March 8, 2022)
  const expInFifteenMin = Math.floor(now / 1000) + 15 * 60;
  const expInThreeMin = Math.floor(now / 1000) + 3 * 60;

  // Mocked session
  const mockSession = {
    user: null,
    isAuthenticated: false,
    expiresSoon: false,
    refreshToken: '',
    expiresAt: 0,
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(() => {
    // Mock Date.now to return a consistent timestamp
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    // Mock cookies
    (cookies as jest.Mock).mockReturnValue({
      getAll: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
    });

    // Mock getIronSession
    (getIronSession as jest.Mock).mockResolvedValue(mockSession);

    // Mock getSessionOptions
    (getSessionOptions as jest.Mock).mockReturnValue({
      password: 'test-secret',
      cookieName: 'session',
      cookieOptions: { secure: true, httpOnly: true },
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a session with the correct user data', async () => {
    // Setup
    (jwtDecode as jest.Mock).mockReturnValue({ exp: expInFifteenMin });

    // Execute
    const session = await createSessionCookie(user, jwt, refreshToken);

    // Verify
    expect(session.user).toEqual(user);
    expect(session.isAuthenticated).toBe(true);
    expect(session.refreshToken).toBe(refreshToken);
    expect(session.save).toHaveBeenCalled();
  });

  it('should calculate the correct TTL based on JWT expiration', async () => {
    // Setup
    (jwtDecode as jest.Mock).mockReturnValue({ exp: expInFifteenMin });

    // Execute
    await createSessionCookie(user, jwt, refreshToken);

    // Verify - should be JWT expiration minus 30 seconds
    const expectedTtl = (expInFifteenMin * 1000 - now) / 1000 - 30;
    expect(getSessionOptions).toHaveBeenCalledWith(expectedTtl);
  });

  it('should mark session as expiring soon when less than 5 minutes remain', async () => {
    // Setup
    (jwtDecode as jest.Mock).mockReturnValue({ exp: expInThreeMin });

    // Execute
    const session = await createSessionCookie(user, jwt, refreshToken);

    // Verify
    expect(session.expiresSoon).toBe(true);
  });

  it('should not mark session as expiring soon when more than 5 minutes remain', async () => {
    // Setup
    (jwtDecode as jest.Mock).mockReturnValue({ exp: expInFifteenMin });

    // Execute
    const session = await createSessionCookie(user, jwt, refreshToken);

    // Verify
    expect(session.expiresSoon).toBe(false);
  });

  it('should store the exact expiration timestamp', async () => {
    // Setup
    (jwtDecode as jest.Mock).mockReturnValue({ exp: expInFifteenMin });

    // Execute
    const session = await createSessionCookie(user, jwt, refreshToken);

    // Verify
    expect(session.expiresAt).toBe(expInFifteenMin * 1000);
  });
});
