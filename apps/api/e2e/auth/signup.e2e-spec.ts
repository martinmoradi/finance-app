import { UserService } from '@/user/user.service';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { generateUniqueEmail, setupAuthTests } from './auth.e2e-utils';

describe('E2E Auth', () => {
  const testUtils = setupAuthTests();
  let app: INestApplication<any>;
  let userService: UserService;

  describe('POST /auth/signup', () => {
    // 1. Happy Path Tests (Core Functionality)
    it('should register a new user with valid credentials', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Generate unique email for this test
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Register new user
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
        })
        .expect(201);

      // Verify the response contains the created user
      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: testEmail,
        name: validName,
      });

      // Verify the user was actually created in the database
      const createdUser = await userService.findByEmail(testEmail);
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(testEmail);
      expect(createdUser?.name).toBe(validName);
    });

    it('should set access and refresh token cookies with correct attributes', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Register new user and get auth cookies
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
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
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Register new user
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
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

    // 2. Validation Tests
    it('should reject password shorter than 8 characters', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data with short password
      const testEmail = generateUniqueEmail();
      const shortPassword = 'Pass1!'; // 6 chars
      const validName = 'Test User';

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register with short password
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: shortPassword,
          name: validName,
        })
        .expect(400);

      // Verify the error response
      expect(response.body.message).toContain('Validation failed');
    });

    it('should reject password without uppercase letter', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data with password missing uppercase
      const testEmail = generateUniqueEmail();
      const noUppercasePassword = 'password123!';
      const validName = 'Test User';

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register with password missing uppercase
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: noUppercasePassword,
          name: validName,
        })
        .expect(400);

      // Verify the error response
      expect(response.body.message).toContain('Validation failed');
    });

    it('should reject password without lowercase letter', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data with password missing lowercase
      const testEmail = generateUniqueEmail();
      const noLowercasePassword = 'PASSWORD123!';
      const validName = 'Test User';

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register with password missing lowercase
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: noLowercasePassword,
          name: validName,
        })
        .expect(400);

      // Verify the error response
      expect(response.body.message).toContain('Validation failed');
    });

    it('should reject password without number', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data with password missing number
      const testEmail = generateUniqueEmail();
      const noNumberPassword = 'Password!';
      const validName = 'Test User';

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register with password missing number
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: noNumberPassword,
          name: validName,
        })
        .expect(400);

      // Verify the error response
      expect(response.body.message).toContain('Validation failed');
    });

    // 3. Required Field Tests
    it('should return 400 when email is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register user without email
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          name: validName,
          password: validPassword,
          // email intentionally omitted
        })
        .expect(400);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Validation failed',
      });

      // Since we don't have an email to check against, we can verify
      // that no new users were created with this name
      const users = await userService.findByEmail(validName);
      expect(users).toBeNull();
    });

    it('should return 400 when password is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Generate unique email for this test
      const testEmail = generateUniqueEmail();
      const validName = 'Test User';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register user without password
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          name: validName,
          // password intentionally omitted
        })
        .expect(400);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Validation failed',
      });

      // Verify no user was created in the database
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeNull();
    });

    it('should return 400 when name is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register user without name
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
          // name intentionally omitted
        })
        .expect(400);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Validation failed',
      });

      // Verify no user was created in the database
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeNull();
    });

    // 4. Security Tests
    it('should return 401 when CSRF token is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First, get cookies including deviceId and CSRF cookie
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register user with cookies but without CSRF token header
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        // Intentionally not setting x-csrf-token header
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid CSRF token',
      });

      // Verify no user was created in the database
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeNull();
    });

    it('should return 401 when CSRF token is invalid', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // Get cookies including deviceId and CSRF cookie
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to sign up with cookies but with invalid CSRF token
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', 'invalid-token')
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
        })
        .expect(401);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid CSRF token',
      });

      // Verify no user was created in the database
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeNull();
    });

    // 5. Business Logic Tests
    it('should return 409 when email already exists', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user with the test email
      await userService.create({
        email: testEmail,
        password: validPassword,
        name: validName,
      });

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Attempt to register another user with the same email
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'DifferentPassword123!',
          name: 'Different Name',
        })
        .expect(409);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 409,
        message: `User with email ${testEmail} already exists`,
        error: 'Conflict',
      });
    });

    // 6. Rate Limiting Tests
    it('should rate limit excessive signup attempts', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Make 5 signup attempts (hitting the limit)
      for (let i = 0; i < 5; i++) {
        const testEmail = generateUniqueEmail();
        await request(app.getHttpServer())
          .post('/auth/signup')
          .set('Cookie', cookies)
          .set('x-csrf-token', csrfToken)
          .send({
            email: testEmail,
            password: 'Password123!',
            name: 'Test User',
          })
          .expect(201);
      }

      // The 6th request should be rate limited
      const testEmail = generateUniqueEmail();
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(429); // Too Many Requests

      // Verify the rate limit response
      expect(response.body).toMatchObject({
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
      });

      // Verify the rate-limited user was not created
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeNull();
    });
  });
});
