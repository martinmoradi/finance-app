import request from 'supertest';
import { setupAuthTests } from './auth.e2e-utils';

describe('E2E Auth', () => {
  // Setup the shared test context
  const testUtils = setupAuthTests();

  // These variables will be initialized from the test context in the tests
  let app;

  describe('POST /auth/csrf-token', () => {
    it('should generate a valid CSRF token', async () => {
      // Get the app from testUtils for this test
      app = testUtils.getApp();

      const response = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBe(128); // 64 bytes = 128 hex characters
    });

    it('should set the CSRF cookie with correct attributes', async () => {
      app = testUtils.getApp();

      const response = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);
      expect(cookies.length).toBeGreaterThan(0);

      const csrfCookie = cookies.find(
        (cookie: string) =>
          cookie.startsWith('csrf=') || cookie.startsWith('__Host-csrf='),
      );
      expect(csrfCookie).toBeDefined();

      // Check cookie attributes
      expect(csrfCookie).toContain('HttpOnly');
      expect(csrfCookie).toContain('Path=/');
      expect(csrfCookie).toContain('SameSite=Lax');
    });

    it('should create a deviceId cookie if not present', async () => {
      app = testUtils.getApp();

      const response = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);
      expect(cookies.length).toBeGreaterThan(0);

      const deviceIdCookie = cookies.find((cookie: string) =>
        cookie.startsWith('deviceId='),
      );

      // Verify deviceId cookie exists and has correct format
      expect(deviceIdCookie).toBeDefined();
      expect(deviceIdCookie).toMatch(/deviceId=[a-f0-9-]{36}/);

      // Verify deviceId is returned in response
      expect(response.body).toHaveProperty('deviceId');
      expect(response.body.deviceId).toMatch(/^[a-f0-9-]{36}$/);
    });

    it('should reuse existing deviceId cookie if present', async () => {
      app = testUtils.getApp();

      // First request to get a deviceId
      const firstResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      const cookies = firstResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(cookies)).toBe(true);
      expect(cookies.length).toBeGreaterThan(0);

      const existingDeviceId = firstResponse.body.deviceId;

      // Second request with existing deviceId cookie
      const secondResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .set('Cookie', cookies)
        .expect(201);

      // Verify the same deviceId is returned
      expect(secondResponse.body.deviceId).toBe(existingDeviceId);

      // Verify no new deviceId cookie is set
      const newCookies = secondResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(Array.isArray(newCookies)).toBe(true);

      const deviceIdCookie = newCookies.find((cookie: string) =>
        cookie.startsWith('deviceId='),
      );
      expect(deviceIdCookie).toBeUndefined();
    });
  });
});
