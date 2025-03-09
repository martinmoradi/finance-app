import { SessionService } from '@/session/session.service';
import { UserService } from '@/user/user.service';
import { INestApplication } from '@nestjs/common';
import { hash } from 'argon2';
import request from 'supertest';
import { generateUniqueEmail, setupAuthTests } from './auth.e2e-utils';

describe('E2E Auth', () => {
  describe('Database Consistency', () => {
    // Get test utilities and services
    const testUtils = setupAuthTests();
    let app: INestApplication;
    let userService: UserService;
    let sessionService: SessionService;

    it('should create user record on signup', async () => {
      // Get the app and userService from testUtils
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

      // Extract deviceId from cookies
      const deviceIdCookie = cookies.find(
        (cookie: string) =>
          cookie.startsWith('deviceId=') ||
          cookie.startsWith('__Host-deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();

      // Perform signup
      await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies as unknown as string[])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
        })
        .expect(201);

      // Verify user was created in database
      const createdUser = await userService.findByEmail(testEmail);

      // Assert user exists
      expect(createdUser).toBeDefined();
      expect(createdUser).not.toBeNull();

      // Verify user properties
      expect(createdUser).toMatchObject({
        id: expect.any(String),
        email: testEmail,
        name: validName,
      });

      // Verify password was hashed
      expect(createdUser?.password).toBeDefined();
      expect(createdUser?.password).not.toBe(validPassword);
      expect(createdUser?.password).toMatch(/^\$argon2/); // Should start with argon2 identifier
    });

    it('should create session record on signup', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      sessionService = testUtils.getSessionService();

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

      // Extract deviceId from cookies
      const deviceIdCookie = cookies.find(
        (cookie: string) =>
          cookie.startsWith('deviceId=') ||
          cookie.startsWith('__Host-deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      if (!deviceIdCookie) {
        throw new Error('Device ID cookie not found');
      }
      const deviceId = deviceIdCookie.split(';')[0]!.split('=')[1];

      // Perform signup
      await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', cookies as unknown as string[])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
          name: validName,
        })
        .expect(201);

      // Get the created user
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeDefined();

      // Verify session was created
      const session = await sessionService.getValidSession({
        userId: user!.id,
        deviceId: deviceId!,
      });

      // Assert session exists and has correct properties
      expect(session).toBeDefined();
      expect(session).toMatchObject({
        userId: user!.id,
        deviceId,
        token: expect.any(String),
        expiresAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      });

      // Verify session expiration is in the future
      expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create new session record on signin', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      sessionService = testUtils.getSessionService();

      // Setup test data
      const testEmail = generateUniqueEmail();
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
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Extract deviceId from cookies
      const deviceIdCookie = cookies.find(
        (cookie: string) =>
          cookie.startsWith('deviceId=') ||
          cookie.startsWith('__Host-deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      if (!deviceIdCookie) {
        throw new Error('Device ID cookie not found');
      }
      const deviceId = deviceIdCookie.split(';')[0]!.split('=')[1];

      // Perform signin
      await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies as unknown as string[])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(200);

      // Verify session was created
      const session = await sessionService.getValidSession({
        userId: user.id,
        deviceId: deviceId!,
      });

      // Assert session exists and has correct properties
      expect(session).toBeDefined();
      expect(session).toMatchObject({
        userId: user.id,
        deviceId,
        token: expect.any(String),
        expiresAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      });

      // Verify session expiration is in the future
      expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should remove session record on signout', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      sessionService = testUtils.getSessionService();

      // Setup test data
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user
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
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);

      // Extract deviceId from cookies
      const deviceIdCookie = cookies.find(
        (cookie: string) =>
          cookie.startsWith('deviceId=') ||
          cookie.startsWith('__Host-deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      if (!deviceIdCookie) {
        throw new Error('Device ID cookie not found');
      }
      const deviceId = deviceIdCookie.split(';')[0]!.split('=')[1];

      // Sign in to create a session
      const signinResponse = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies as unknown as string[])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(200);

      // Get auth cookies from signin response
      const authCookies = signinResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Verify session exists before signout
      const sessionBeforeSignout = await sessionService.getValidSession({
        userId: user.id,
        deviceId: deviceId!,
      });
      expect(sessionBeforeSignout).toBeDefined();

      // Perform signout
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', [...cookies, ...authCookies] as unknown as string[])
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Verify session was removed
      await expect(
        sessionService.getValidSession({
          userId: user.id,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow();
    });

    it('should maintain session record validity after token refresh', async () => {
      // Get the app and services from testUtils
      app = testUtils.getApp();
      userService = testUtils.getUserService();
      sessionService = testUtils.getSessionService();

      // Setup test data
      const testEmail = generateUniqueEmail();
      const validPassword = 'Password123!';
      const validName = 'Test User';

      // First create a user to test with
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
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const cookies = csrfResponse.headers['set-cookie'] as unknown as string[];

      // Extract deviceId from cookies
      const deviceIdCookie = cookies.find((cookie: string) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeDefined();
      const deviceId = deviceIdCookie?.split(';')[0]?.split('=')[1];
      expect(deviceId).toBeDefined();

      // Sign in to create a session
      const signinResponse = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: validPassword,
        })
        .expect(200);

      // Get auth cookies from signin response
      const authCookies = signinResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(authCookies)).toBe(true);

      // Get the initial session state
      const initialSession = await sessionService.getValidSession({
        userId: user.id,
        deviceId: deviceId!,
      });
      expect(initialSession).toBeDefined();

      // Store initial session values
      const initialToken = initialSession.token;
      const initialLastUsedAt = initialSession.lastUsedAt;
      const initialCreatedAt = initialSession.createdAt;
      const initialExpiresAt = initialSession.expiresAt;

      // Combine cookies for the refresh request
      const allCookies = [...cookies, ...authCookies];

      // Wait a bit to ensure lastUsedAt will be different
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Perform token refresh
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Get the updated session
      const refreshedSession = await sessionService.getValidSession({
        userId: user.id,
        deviceId: deviceId!,
      });
      expect(refreshedSession).toBeDefined();

      // Verify session record properties after refresh
      expect(refreshedSession.userId).toBe(user.id);
      expect(refreshedSession.deviceId).toBe(deviceId);

      // Token should be updated
      expect(refreshedSession.token).not.toBe(initialToken);

      // lastUsedAt should be updated to a newer timestamp
      expect(refreshedSession.lastUsedAt.getTime()).toBeGreaterThan(
        initialLastUsedAt.getTime(),
      );

      // createdAt should remain the same
      expect(refreshedSession.createdAt.getTime()).toBe(
        initialCreatedAt.getTime(),
      );

      // expiresAt should remain the same
      expect(refreshedSession.expiresAt.getTime()).toBe(
        initialExpiresAt.getTime(),
      );
    });
  });
});
