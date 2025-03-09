import { SessionExpiredException } from '@/session/exceptions';
import { UserService } from '@/user/user.service';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { generateUniqueEmail, setupAuthTests } from './auth.e2e-utils';

describe('E2E Auth', () => {
  // Setup the shared test context
  const testUtils = setupAuthTests();

  // These variables will be initialized from the test context in the tests
  let app: INestApplication<any>;
  let userService: UserService;

  describe('POST /auth/refresh', () => {
    // 1. Happy Path Tests (Core Functionality)
    it('should issue new tokens with valid refresh token', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      const sessionService = testUtils.getSessionService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      const deviceIdCookie = cookies.find((cookie) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      const deviceId = deviceIdCookie?.split('=')[1]?.split(';')[0];
      expect(deviceId).toBeDefined();

      // 2. Register a test user
      const testEmail = generateUniqueEmail();

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      const userId = signupResponse.body.id;
      expect(userId).toBeDefined();

      // Get auth cookies from signup
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Verify initial session exists
      const session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.deviceId).toBe(deviceId);

      // 3. Request token refresh
      const allCookies = [...cookies, ...authCookies];
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 4. Verify the response contains user data
      expect(refreshResponse.body).toEqual({
        id: userId,
        email: testEmail,
        name: 'Test User',
      });

      // 5. Verify new tokens are set in cookies
      const newAuthCookies = refreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(newAuthCookies)).toBe(true);
      expect(
        newAuthCookies.some((cookie) => cookie.startsWith('accessToken=')),
      ).toBe(true);
      expect(
        newAuthCookies.some((cookie) => cookie.startsWith('refreshToken=')),
      ).toBe(true);

      // 6. Verify session is maintained (not recreated)
      const updatedSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(updatedSession).toBeDefined();
      expect(updatedSession.userId).toBe(userId);
      expect(updatedSession.deviceId).toBe(deviceId);
      expect(updatedSession.lastUsedAt).not.toBe(session.lastUsedAt);
    });

    it('should set new access and refresh token cookies', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      const sessionService = testUtils.getSessionService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      const deviceIdCookie = cookies.find((cookie) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      const deviceId = deviceIdCookie?.split('=')[1]?.split(';')[0];
      expect(deviceId).toBeDefined();

      // 2. Register a test user
      const testEmail = generateUniqueEmail();

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Get initial auth cookies from signup
      const initialAuthCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(initialAuthCookies)).toBe(true);

      // Extract initial token values for comparison
      const accessTokenCookie = initialAuthCookies.find((cookie) =>
        cookie.startsWith('accessToken='),
      );
      const refreshTokenCookie = initialAuthCookies.find((cookie) =>
        cookie.startsWith('refreshToken='),
      );

      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();

      // For initial tokens
      const initialAccessToken = accessTokenCookie!
        .split(';')[0]!
        .split('=')[1]!;
      const initialRefreshToken = refreshTokenCookie!
        .split(';')[0]!
        .split('=')[1]!;

      // Wait a moment to ensure tokens will be different
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Request token refresh
      const allCookies = [...cookies, ...initialAuthCookies];
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 4. Verify new tokens are set in cookies
      const newAuthCookies = refreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(newAuthCookies)).toBe(true);

      // Extract new token values
      const newAccessTokenCookie = newAuthCookies.find((cookie) =>
        cookie.startsWith('accessToken='),
      );
      const newRefreshTokenCookie = newAuthCookies.find((cookie) =>
        cookie.startsWith('refreshToken='),
      );

      expect(newAccessTokenCookie).toBeDefined();
      expect(newRefreshTokenCookie).toBeDefined();

      // For new tokens
      const newAccessToken = newAccessTokenCookie!
        .split(';')[0]!
        .split('=')[1]!;
      const newRefreshToken = newRefreshTokenCookie!
        .split(';')[0]!
        .split('=')[1]!;

      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();

      // Verify tokens have changed
      expect(newAccessToken).not.toBe(initialAccessToken);
      expect(newRefreshToken).not.toBe(initialRefreshToken);

      // Verify cookie attributes
      expect(newAccessTokenCookie).toMatch(/HttpOnly/);
      expect(newAccessTokenCookie).toMatch(/SameSite=Lax/);
      expect(newAccessTokenCookie).toMatch(/Path=\//);

      expect(newRefreshTokenCookie).toMatch(/HttpOnly/);
      expect(newRefreshTokenCookie).toMatch(/SameSite=Lax/);
      expect(newRefreshTokenCookie).toMatch(/Path=\//);

      // 5. Verify the tokens work by checking session
      const session = await sessionService.getValidSession({
        userId: signupResponse.body.id,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.deviceId).toBe(deviceId);
    });

    it('should maintain the same session after token refresh', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      const sessionService = testUtils.getSessionService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      const deviceIdCookie = cookies.find((cookie) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      const deviceId = deviceIdCookie?.split('=')[1]?.split(';')[0];
      expect(deviceId).toBeDefined();

      // 2. Register a test user
      const testEmail = generateUniqueEmail();

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      const userId = signupResponse.body.id;
      expect(userId).toBeDefined();

      // Get auth cookies from signup
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Get the initial session
      const initialSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(initialSession).toBeDefined();

      // Store initial session state
      const initialLastUsedAt = initialSession.lastUsedAt;
      const initialCreatedAt = initialSession.createdAt;
      const initialExpiresAt = initialSession.expiresAt;

      // Wait a moment to ensure timestamps will be different
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Perform token refresh
      const allCookies = [...cookies, ...authCookies];
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 4. Get the session after refresh
      const refreshedSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(refreshedSession).toBeDefined();

      // 5. Verify session properties
      // Session should be for the same user and device
      expect(refreshedSession.userId).toBe(userId);
      expect(refreshedSession.deviceId).toBe(deviceId);

      // LastUsedAt should be updated
      expect(refreshedSession.lastUsedAt.getTime()).toBeGreaterThan(
        initialLastUsedAt.getTime(),
      );

      // ExpiresAt should remain the same (fixed lifetime)
      expect(refreshedSession.expiresAt.getTime()).toBe(
        initialExpiresAt.getTime(),
      );

      // CreatedAt should remain unchanged
      expect(refreshedSession.createdAt.getTime()).toBe(
        initialCreatedAt.getTime(),
      );
    });

    // 2. Authentication Tests
    it('should return 401 when refresh token is missing', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      // 2. Register a test user
      const testEmail = generateUniqueEmail();

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Get auth cookies from signup
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Filter out the refresh token cookie
      const cookiesWithoutRefreshToken = [
        ...cookies,
        ...authCookies.filter((cookie) => !cookie.startsWith('refreshToken=')),
      ];

      // 3. Attempt to refresh without refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookiesWithoutRefreshToken)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      // 4. Verify the error response
      expect(refreshResponse.body).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });

      // 5. Verify no new tokens were set
      expect(refreshResponse.headers['set-cookie']).toBeUndefined();
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      // 2. Register a test user
      const testEmail = generateUniqueEmail();

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Get auth cookies from signup
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Replace refresh token with invalid one
      const cookiesWithInvalidRefreshToken = [
        ...cookies,
        ...authCookies
          .filter((cookie) => !cookie.startsWith('refreshToken='))
          .concat([
            'refreshToken=invalid-token; Path=/; HttpOnly; SameSite=Lax',
          ]),
      ];

      // 3. Attempt to refresh with invalid refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookiesWithInvalidRefreshToken)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      // 4. Verify the error response
      expect(refreshResponse.body).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });

      // 5. Verify no new tokens were set
      expect(refreshResponse.headers['set-cookie']).toBeUndefined();
    });

    it('should return 401 when refresh token is expired', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      const sessionService = testUtils.getSessionService();

      // Mock the getValidSession to simulate expired session
      jest
        .spyOn(sessionService, 'getValidSession')
        .mockImplementationOnce(() => {
          throw new SessionExpiredException();
        });

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      // 2. Register a test user
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const testEmail = `test-${timestamp}-${random}@example.com`;

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Get auth cookies from signup
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // 3. Attempt to refresh with "expired" session
      const allCookies = [...cookies, ...authCookies];
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      // 4. Verify the error response
      expect(refreshResponse.body).toEqual({
        statusCode: 401,
        message: 'Authentication failed',
        error: 'Unauthorized',
      });

      // 5. Verify no new tokens were set
      expect(refreshResponse.headers['set-cookie']).toBeUndefined();
    });

    // 3. Device ID Tests
    it("should return 401 when deviceId doesn't match session", async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      const sessionService = testUtils.getSessionService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      const deviceIdCookie = cookies.find((cookie) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      const deviceId = deviceIdCookie?.split('=')[1]?.split(';')[0];
      expect(deviceId).toBeDefined();

      // 2. Register a test user
      const testEmail = generateUniqueEmail();

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      const userId = signupResponse.body.id;
      expect(userId).toBeDefined();

      // Get auth cookies from signup
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Create a different deviceId cookie
      const differentDeviceId = 'different-device-id';
      const modifiedCookies = [
        ...cookies.filter(
          (cookie) =>
            cookie.startsWith('csrf=') || cookie.startsWith('__Host-csrf='),
        ),
        ...authCookies,
        `deviceId=${differentDeviceId}; Path=/; HttpOnly; SameSite=Lax`,
      ];

      // 3. Attempt to refresh with mismatched deviceId
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', modifiedCookies)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      // 4. Verify the error response
      expect(refreshResponse.body).toEqual({
        statusCode: 401,
        message: 'Authentication failed',
        error: 'Unauthorized',
      });

      // 5. Verify no new tokens were set
      expect(refreshResponse.headers['set-cookie']).toBeUndefined();

      // 6. Verify original session still exists
      const originalSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(originalSession).toBeDefined();
      expect(originalSession.deviceId).toBe(deviceId);
    });

    // 4. Security Tests
    it('should rate limit excessive refresh attempts', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      const throttlerStorage = testUtils.getThrottlerStorage();

      // Explicitly ensure throttler storage is clean
      const storage = (throttlerStorage as any).storage;
      if (storage && typeof storage.clear === 'function') {
        storage.clear();
      }

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      // 2. Register a test user
      const testEmail = generateUniqueEmail();

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Get auth cookies from signup
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Generate a deterministic IP for throttling
      const testIp = '127.0.0.1';

      let currentCookies = [...cookies, ...authCookies];

      // 3. Make 5 sequential refresh requests (hitting the limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Cookie', currentCookies)
          .set('x-csrf-token', csrfToken)
          .set('X-Forwarded-For', testIp)
          .expect(200);

        // Update cookies with new tokens for next request
        if (response.headers['set-cookie']) {
          const newAuthCookies = response.headers['set-cookie'];
          // Preserve non-auth cookies, replace auth cookies
          currentCookies = [
            ...cookies.filter(
              (c) =>
                !c.startsWith('accessToken=') && !c.startsWith('refreshToken='),
            ),
            ...newAuthCookies,
          ];
        }

        // Small delay to ensure requests are properly recorded in throttler
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // 4. The 6th request should be rate limited
      // Add retry logic for potentially flaky tests
      let rateLimitDetected = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!rateLimitDetected && attempts < maxAttempts) {
        attempts++;

        try {
          const rateLimitedResponse = await request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Cookie', currentCookies) // Use the current valid tokens
            .set('x-csrf-token', csrfToken)
            .set('X-Forwarded-For', testIp) // Same IP for rate limiting
            .expect(429); // Too Many Requests

          // If we get here, the rate limit was detected
          rateLimitDetected = true;

          // 5. Verify the rate limit response
          expect(rateLimitedResponse.body).toMatchObject({
            statusCode: 429,
            message: 'ThrottlerException: Too Many Requests',
          });

          // 6. Verify no new tokens were set in rate-limited response
          expect(rateLimitedResponse.headers['set-cookie']).toBeUndefined();
        } catch (error) {
          if (attempts >= maxAttempts) {
            // Re-throw on last attempt
            throw error;
          }
          // Wait a bit longer before the next attempt
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      expect(rateLimitDetected).toBe(true);
    });
  });
});
