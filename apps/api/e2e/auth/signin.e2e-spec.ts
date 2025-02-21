import { setupAuthTests } from './auth.e2e-utils';
import request from 'supertest';
import { hash } from 'argon2';

describe('E2E Auth', () => {
  // Setup the shared test context
  const testUtils = setupAuthTests();

  // These variables will be initialized from the test context in the tests
  let app;
  let userService;

  describe('POST /auth/signin', () => {
    it('should authenticate user with valid credentials', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test signin - now with hashed password
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign in
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: testEmail,
        name: validName,
      });

      // Verify sensitive information is not included
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('hashedPassword');
      expect(response.body).not.toHaveProperty('refreshTokens');

      // Verify auth cookies are set
      const authCookies = response.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      const accessTokenCookie = authCookies.find(
        (cookie) =>
          cookie.startsWith('accessToken=') ||
          cookie.startsWith('__Host-accessToken='),
      );
      const refreshTokenCookie = authCookies.find(
        (cookie) =>
          cookie.startsWith('refreshToken=') ||
          cookie.startsWith('__Host-refreshToken='),
      );

      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();

      // Verify cookie attributes
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('Path=/');
      expect(accessTokenCookie).toContain('SameSite=Lax');

      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('Path=/');
      expect(refreshTokenCookie).toContain('SameSite=Lax');
    });

    it('should return 401 when email is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data - only password since we're testing missing email
      const validPassword = 'Password123!';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign in without email
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          // email intentionally omitted
          password: validPassword,
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('should return 401 when password is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data - only email since we're testing missing password
      const testEmail = `test-${Date.now()}@example.com`;

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign in without password
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          // password intentionally omitted
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('should return 400 when deviceId cookie is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test signin
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get CSRF token and cookies
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];

      // Find only the CSRF cookie, exclude deviceId cookie
      const csrfCookie = cookies.find(
        (cookie: string) =>
          cookie.startsWith('csrf=') || cookie.startsWith('__Host-csrf='),
      );
      expect(csrfCookie).toBeDefined();

      // Attempt to sign in with CSRF cookie but without deviceId cookie
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', [csrfCookie as string])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(400);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Device ID is required',
      });
    });

    it('should return 401 when CSRF token is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test signin
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get cookies including deviceId and CSRF cookie
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign in with cookies but without CSRF token header
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        // Intentionally not setting x-csrf-token header
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid CSRF token',
      });
    });

    it('should return 401 when CSRF token is invalid', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test signin
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get cookies including deviceId and CSRF cookie
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign in with cookies but with invalid CSRF token
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', 'invalid-token')
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid CSRF token',
      });
    });

    it('should return 401 when email is incorrect', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data with non-existent email
      const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
      const validPassword = 'Password123!';

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign in with non-existent email
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: nonExistentEmail,
          password: validPassword,
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'User not found',
      });
    });

    it('should return 401 when password is incorrect', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const wrongPassword = 'WrongPassword123!';
      const validName = 'Test User';

      // First create a user to test signin
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign in with wrong password
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: wrongPassword,
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should set access and refresh token cookies with correct attributes', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test signin
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Sign in to get auth cookies
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(201);

      // Verify auth cookies are set
      const authCookies = response.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Find access and refresh token cookies
      const accessTokenCookie = authCookies.find(
        (cookie) =>
          cookie.startsWith('accessToken=') ||
          cookie.startsWith('__Host-accessToken='),
      );
      const refreshTokenCookie = authCookies.find(
        (cookie) =>
          cookie.startsWith('refreshToken=') ||
          cookie.startsWith('__Host-refreshToken='),
      );

      // Verify cookies exist
      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();

      // Verify access token cookie attributes
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('Path=/');
      expect(accessTokenCookie).toContain('SameSite=Lax');
      expect(accessTokenCookie).not.toContain('Domain=');
      expect(accessTokenCookie).toMatch(/Max-Age=\d+/); // Should have an expiration
      expect(accessTokenCookie).toMatch(/Expires=.+GMT/); // Should have an expiration date

      // Verify refresh token cookie attributes
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('Path=/');
      expect(refreshTokenCookie).toContain('SameSite=Lax');
      expect(refreshTokenCookie).not.toContain('Domain=');
      expect(refreshTokenCookie).toMatch(/Max-Age=\d+/);
      expect(refreshTokenCookie).toMatch(/Expires=.+GMT/);

      // Verify refresh token has longer expiration than access token
      const accessMaxAge = parseInt(
        accessTokenCookie?.match(/Max-Age=(\d+)/)?.[1] || '0',
      );
      const refreshMaxAge = parseInt(
        refreshTokenCookie?.match(/Max-Age=(\d+)/)?.[1] || '0',
      );
      expect(refreshMaxAge).toBeGreaterThan(accessMaxAge);
    });

    it('should return user data without sensitive information', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test signin
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Sign in and get user data
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(201);

      // Verify response contains expected public user data
      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: testEmail,
        name: validName,
      });

      // Verify response does not contain sensitive data
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('hashedPassword');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('refreshTokens');
      expect(response.body).not.toHaveProperty('sessions');

      // Verify response only contains allowed fields
      const allowedFields = ['id', 'email', 'name'];
      const responseFields = Object.keys(response.body);
      expect(responseFields.sort()).toEqual(allowedFields.sort());
    });

    it('should rate limit excessive signin attempts', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test signin
      const hashedPassword = await hash(validPassword);
      const user = await userService.create({
        email: testEmail,
        password: hashedPassword,
        name: validName,
      });
      expect(user).toBeDefined();

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Make 5 successful requests (hitting the limit)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/signin')
          .set('Cookie', cookies)
          .set('x-csrf-token', csrfToken)
          .send({
            email: testEmail,
            password: validPassword,
          })
          .expect(201);
      }

      // The 6th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(429); // Too Many Requests

      // Verify the rate limit response
      expect(response.body).toMatchObject({
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
      });
    });
  });
});
