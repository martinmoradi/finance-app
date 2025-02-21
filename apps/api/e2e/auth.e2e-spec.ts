import { TestDatabaseService } from '@/database/__tests__/test-database.service';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import {
  DatabaseConnection,
  rollbackTransaction,
  startTransaction,
} from '@repo/database';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { setupTestApp } from '../src/utils/test-setup';
import { AppModule } from './../src/app.module';
import { Express } from 'express';
import { UserService } from '@/user/user.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let connection: DatabaseConnection;
  let testDbService: TestDatabaseService;
  let userService: UserService;
  beforeEach(async () => {
    // Use the setupTestApp utility with cookie-parser middleware
    const testApp = await setupTestApp(AppModule, async (app) => {
      app.use(cookieParser());
    });

    app = testApp.app;
    moduleRef = testApp.moduleRef;
    connection = testApp.connection;
    testDbService = testApp.testDbService;
    userService = moduleRef.get(UserService);

    // Start transaction for test isolation
    await startTransaction(connection.pool);
  });

  afterEach(async () => {
    // Rollback transaction after each test
    await rollbackTransaction(connection.pool);
    await app.close();
  });

  describe('POST /auth/csrf-token', () => {
    it('should generate a valid CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBe(128); // 64 bytes = 128 hex characters
    });

    it('should set the CSRF cookie with correct attributes', async () => {
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
