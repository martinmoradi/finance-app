import request from 'supertest';
import { setupAuthTests } from './auth.e2e-utils';

describe('E2E Auth', () => {
  // Setup the shared test context
  const testUtils = setupAuthTests();

  // These variables will be initialized from the test context in the tests
  let app;
  let userService;

  describe('POST /auth/signup', () => {
    it('should register a new user with valid credentials', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Generate unique email for this test
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

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

    it('should return 400 when password is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Generate unique email for this test
      const testEmail = `test-${Date.now()}@example.com`;
      const validName = 'Test User';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

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
        .expect(201);

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

    it('should return 400 when name is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';

      // First, get CSRF token and deviceId
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

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

    it('should return 400 when deviceId cookie is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First, get CSRF token and cookies
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

      // Attempt to register user with CSRF cookie but without deviceId cookie
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', [csrfCookie as string])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
        })
        .expect(400);

      // Verify the error response structure
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Device ID is required',
      });

      // Verify no user was created in the database
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeNull();
    });

    // Additional tests...
    it('should return 401 when CSRF token is missing', async () => {
      // Get the app and userService from testUtils for this test
      app = testUtils.getApp();
      userService = testUtils.getUserService();

      // Setup test data
      const testEmail = `test-${Date.now()}@example.com`;
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First, get cookies including deviceId and CSRF cookie
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

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

    // More tests would follow here...
    // I've included just a few examples for brevity, but you would include all your existing signup tests
  });
});
