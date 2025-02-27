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

  describe('POST /auth/signout', () => {
    // 1. Happy Path Tests (Core Functionality)
    it('should successfully sign out an authenticated user', async () => {
      // Get the app and userService from testUtils
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

      const deviceIdCookie = cookies.find((cookie) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();

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

      // Get auth cookies from signup response
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);
      expect(
        authCookies.some((cookie) => cookie.startsWith('accessToken=')),
      ).toBe(true);
      expect(
        authCookies.some((cookie) => cookie.startsWith('refreshToken=')),
      ).toBe(true);

      // 3. Sign out the user - include both deviceId and auth cookies
      const allCookies = [...cookies, ...authCookies];
      const signoutResponse = await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 4. Verify the response
      expect(signoutResponse.body).toEqual({
        message: 'Successfully signed out',
      });
    });

    it('should clear auth cookies upon successful signout', async () => {
      // Get the app and userService from testUtils
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

      // Get auth cookies from signup response
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // 3. Sign out the user
      const allCookies = [...cookies, ...authCookies];
      const signoutResponse = await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 4. Verify that the response includes cookies with clearing instructions
      const clearCookies = signoutResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(clearCookies)).toBe(true);

      // Check for access token cookie clearing
      const accessTokenCookie = clearCookies.find((cookie) =>
        cookie.startsWith('accessToken='),
      );
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toMatch(/accessToken=;/); // Empty value
      expect(accessTokenCookie).toMatch(/Expires=Thu, 01 Jan 1970/); // Past date expiration
      expect(accessTokenCookie).toMatch(/HttpOnly/);
      expect(accessTokenCookie).toMatch(/SameSite=Lax/);
      expect(accessTokenCookie).toMatch(/Path=\//);

      // Check for refresh token cookie clearing
      const refreshTokenCookie = clearCookies.find((cookie) =>
        cookie.startsWith('refreshToken='),
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toMatch(/refreshToken=;/); // Empty value
      expect(refreshTokenCookie).toMatch(/Expires=Thu, 01 Jan 1970/); // Past date expiration
      expect(refreshTokenCookie).toMatch(/HttpOnly/);
      expect(refreshTokenCookie).toMatch(/SameSite=Lax/);
      expect(refreshTokenCookie).toMatch(/Path=\//);

      // DeviceId cookie should also be cleared
      const deviceIdCookie = clearCookies.find((cookie) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      expect(deviceIdCookie).toMatch(/deviceId=;/); // Empty value
      expect(deviceIdCookie).toMatch(/Expires=Thu, 01 Jan 1970/); // Past date expiration
      expect(deviceIdCookie).toMatch(/HttpOnly/);
      expect(deviceIdCookie).toMatch(/SameSite=Lax/);
      expect(deviceIdCookie).toMatch(/Path=\//);
    });

    it('should invalidate the session in the database', async () => {
      // Get the app and userService from testUtils
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

      // Extract deviceId from cookie
      const deviceIdCookie = cookies.find((cookie) =>
        cookie.startsWith('deviceId='),
      );
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

      // Get auth cookies from signup response
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Verify session exists in database
      const session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.deviceId).toBe(deviceId);

      // 3. Sign out the user
      const allCookies = [...cookies, ...authCookies];
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 4. Verify session is invalidated
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow('Failed to validate session');
    });

    // 2. Authentication/Security Tests
    it('should return 401 when access token is missing', async () => {
      // Get the app and userService from testUtils
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

      // Get auth cookies from signup response
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Filter out the access token cookie, keeping only deviceId and refresh token
      const cookiesWithoutAccessToken = [
        ...cookies,
        ...authCookies.filter((cookie) => !cookie.startsWith('accessToken=')),
      ];

      // 3. Attempt to sign out without access token
      const signoutResponse = await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', cookiesWithoutAccessToken)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      // 4. Verify the error response
      expect(signoutResponse.body).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('should return 401 when deviceId cookie is missing', async () => {
      // Get the app and userService from testUtils
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

      // Get auth cookies from signup response
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Filter out the deviceId cookie, keeping only auth tokens
      const cookiesWithoutDeviceId = authCookies.filter(
        (cookie) => !cookie.startsWith('deviceId='),
      );

      // 3. Attempt to sign out without deviceId
      const signoutResponse = await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', cookiesWithoutDeviceId)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      // 4. Verify the error response
      expect(signoutResponse.body).toEqual({
        statusCode: 401,
        message: 'Invalid CSRF token',
        error: 'Unauthorized',
      });
    });

    // 3. CSRF Protection Tests
    it('should return 401 when CSRF token is missing', async () => {
      // Get the app and userService from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      // 2. Register a test user
      const testEmail = generateUniqueEmail();
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfResponse.body.token)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Get auth cookies from signup response
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // 3. Attempt to sign out without CSRF token
      const allCookies = [...cookies, ...authCookies];
      const signoutResponse = await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        // No CSRF token set
        .expect(401);

      // 4. Verify the error response
      expect(signoutResponse.body).toEqual({
        statusCode: 401,
        message: 'Invalid CSRF token',
        error: 'Unauthorized',
      });
    });

    it('should return 401 when CSRF token is invalid', async () => {
      // Get the app and userService from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // 1. First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);

      // 2. Register a test user
      const testEmail = generateUniqueEmail();
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfResponse.body.token)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Get auth cookies from signup response
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // 3. Attempt to sign out with invalid CSRF token
      const allCookies = [...cookies, ...authCookies];
      const signoutResponse = await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', 'invalid-token')
        .expect(401);

      // 4. Verify the error response
      expect(signoutResponse.body).toEqual({
        statusCode: 401,
        message: 'Invalid CSRF token',
        error: 'Unauthorized',
      });
    });
  });
});
