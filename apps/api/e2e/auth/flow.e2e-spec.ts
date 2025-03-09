import { generateUniqueEmail, setupAuthTests } from './auth.e2e-utils';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { SessionService } from '@/session/session.service';
import { UserService } from '@/user/user.service';

describe('E2E Auth', () => {
  // Setup the shared test context
  const testUtils = setupAuthTests();

  let app: INestApplication<any>;
  let sessionService: SessionService;
  let userService: UserService;

  describe('Complete authentication flow', () => {
    it('should allow full signup -> refresh -> signout flow', async () => {
      // Get services from test utils
      app = testUtils.getApp();
      sessionService = testUtils.getSessionService();
      userService = testUtils.getUserService();

      // Get initial CSRF token and cookies
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const initialCookies = csrfResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const deviceId = initialCookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];
      expect(deviceId).toBeDefined();
      expect(csrfToken).toBeDefined();

      // 1. Signup
      const testEmail = generateUniqueEmail();
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', initialCookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Verify user was created and session exists
      const userId = signupResponse.body.id;
      const user = await userService.findById(userId);
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);

      let session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.deviceId).toBe(deviceId);

      // Store initial token to verify it changes
      const initialToken = session.token;

      // Combine cookies for subsequent requests
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      let allCookies = [...initialCookies, ...authCookies];

      // 2. Refresh token and verify session is maintained
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Update cookies with new tokens
      const newAuthCookies = refreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      allCookies = [...initialCookies, ...newAuthCookies];

      // Verify session is still valid but updated
      session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.deviceId).toBe(deviceId);
      // Token should be different after refresh
      expect(session.token).not.toBe(initialToken);
      const firstRefreshTime = session.lastUsedAt;
      const firstRefreshToken = session.token;

      // 3. Second refresh to verify session persistence
      const secondRefreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Update cookies again with newest tokens
      const newestAuthCookies = secondRefreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      allCookies = [...initialCookies, ...newestAuthCookies];

      // Verify session is still valid and lastUsedAt is updated
      session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.lastUsedAt.getTime()).toBeGreaterThan(
        firstRefreshTime.getTime(),
      );
      // Token should be different after second refresh
      expect(session.token).not.toBe(firstRefreshToken);

      // 4. Sign out
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Verify session is invalidated
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow('Failed to validate session');

      // 5. Verify refresh fails after signout
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(401);
    });

    it('should allow signup -> signout -> signin -> signout flow', async () => {
      // Get services from test utils
      app = testUtils.getApp();
      sessionService = testUtils.getSessionService();
      userService = testUtils.getUserService();

      // Get initial CSRF token and cookies
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const initialCookies = csrfResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const deviceId = initialCookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];
      expect(deviceId).toBeDefined();
      expect(csrfToken).toBeDefined();

      // 1. Signup
      const testEmail = generateUniqueEmail();
      const testPassword = 'Password123!';
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', initialCookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
        })
        .expect(201);

      // Verify user was created and initial session exists
      const userId = signupResponse.body.id;
      const user = await userService.findById(userId);
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);

      let session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      // No need to save or check initial token anymore

      // Combine cookies for first signout
      const firstAuthCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      let allCookies = [...initialCookies, ...firstAuthCookies];

      // 2. First signout
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Verify first session is invalidated
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow('Failed to validate session');

      // 3. Signin with same credentials
      const signinResponse = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', initialCookies) // Only need deviceId for signin
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      // Verify new session is created
      session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.deviceId).toBe(deviceId);

      // Update cookies for final signout
      const newAuthCookies = signinResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      allCookies = [...initialCookies, ...newAuthCookies];

      // 4. Final signout
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Verify final session cleanup
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow('Failed to validate session');

      // 5. Verify signin is still possible after final signout
      await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', initialCookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);
    });

    it('should maintain session integrity across token refreshes', async () => {
      // Get services from test utils
      app = testUtils.getApp();
      sessionService = testUtils.getSessionService();
      userService = testUtils.getUserService();

      // Get initial CSRF token and cookies
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const initialCookies = csrfResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const deviceId = initialCookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];
      expect(deviceId).toBeDefined();
      expect(csrfToken).toBeDefined();

      // 1. Create test user and get initial session
      const testEmail = generateUniqueEmail();
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', initialCookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      const userId = signupResponse.body.id;

      // Get initial session state
      let session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      const initialCreatedAt = session.createdAt;
      const initialExpiresAt = session.expiresAt;

      // Keep track of current valid cookies
      let currentCookies = [
        ...initialCookies,
        ...(signupResponse.headers['set-cookie'] as unknown as string[]),
      ];

      // 2. Perform token refreshes
      const refreshCount = 3;
      const refreshDelay = 1000; // 1 second between refreshes

      for (let i = 0; i < refreshCount; i++) {
        await new Promise((resolve) => setTimeout(resolve, refreshDelay));

        // Perform refresh with current valid cookies
        const refreshResponse = await request(app.getHttpServer())
          .post('/auth/refresh') // This matches the cookie path exactly
          .set('Cookie', currentCookies)
          .set('x-csrf-token', csrfToken)
          .expect(200);

        // Update cookies with new auth cookies
        const newAuthCookies = refreshResponse.headers[
          'set-cookie'
        ] as unknown as string[];

        // Replace the cookies, maintaining the correct paths
        currentCookies = currentCookies
          .filter(
            (cookie) =>
              !cookie.includes('accessToken=') &&
              !cookie.includes('refreshToken='),
          )
          .concat(newAuthCookies);

        // Verify session after refresh
        session = await sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        });

        // Verify core properties remain unchanged
        expect(session.userId).toBe(userId);
        expect(session.deviceId).toBe(deviceId);
        expect(session.createdAt.getTime()).toBe(initialCreatedAt.getTime());
        expect(session.expiresAt.getTime()).toBe(initialExpiresAt.getTime());

        // Verify returned user data
        const refreshedUserData = refreshResponse.body;
        expect(refreshedUserData).toEqual({
          id: userId,
          email: testEmail,
          name: 'Test User',
        });
      }

      // 3. Final session verification
      const finalSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(finalSession.userId).toBe(userId);
      expect(finalSession.deviceId).toBe(deviceId);
      expect(finalSession.createdAt.getTime()).toBe(initialCreatedAt.getTime());
      expect(finalSession.expiresAt.getTime()).toBe(initialExpiresAt.getTime());

      // 4. One last refresh to verify continued usability
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', currentCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 5. Verify signout works
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', currentCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // Verify session is invalidated
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow('Failed to validate session');
    });

    it('should properly invalidate all related tokens on signout', async () => {
      // Get services from test utils
      app = testUtils.getApp();
      sessionService = testUtils.getSessionService();
      userService = testUtils.getUserService();

      // Get initial CSRF token and cookies
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const initialCookies = csrfResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const deviceId = initialCookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];
      expect(deviceId).toBeDefined();
      expect(csrfToken).toBeDefined();

      // 1. Signup
      const testEmail = generateUniqueEmail();
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', initialCookies)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      // Verify user was created and session exists
      const userId = signupResponse.body.id;
      const user = await userService.findById(userId);
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);

      // Verify session was created
      const session = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.deviceId).toBe(deviceId);

      // Combine cookies for subsequent requests
      const authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const allCookies = [...initialCookies, ...authCookies];

      // 2. Signout
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 3. Verify session is invalidated in the database
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow('Failed to validate session');

      // 4. Verify access token is invalidated by trying to access a protected endpoint
      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      expect(meResponse.body).toMatchObject({
        statusCode: 401,
        message: 'Authentication failed',
      });

      // 5. Verify refresh token is invalidated by trying to refresh
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(401);

      expect(refreshResponse.body).toMatchObject({
        statusCode: 401,
        message: 'Authentication failed',
      });

      // 6. Try to sign in again and verify a new session can be created
      const signinResponse = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', initialCookies) // Only need deviceId for signin
        .set('x-csrf-token', csrfToken)
        .send({
          email: testEmail,
          password: 'Password123!',
        })
        .expect(200);

      const newAuthCookies = signinResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const newAllCookies = [...initialCookies, ...newAuthCookies];

      // 7. Verify new session was created and is valid
      const newSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(newSession).toBeDefined();
      expect(newSession.userId).toBe(userId);
      expect(newSession.deviceId).toBe(deviceId);
      expect(newSession.token).not.toBe(session.token);

      // 8. Verify the new tokens work for accessing protected endpoints
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', newAllCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);
    });

    it('should handle token rotation across multiple refreshes', async () => {
      // Get services from test utils
      app = testUtils.getApp();
      sessionService = testUtils.getSessionService();
      userService = testUtils.getUserService();

      // Get initial CSRF token and cookies
      const csrfResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const csrfToken = csrfResponse.body.token;
      const initialCookies = csrfResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const deviceId = initialCookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];
      expect(deviceId).toBeDefined();
      expect(csrfToken).toBeDefined();

      // 1. Create a test user and sign up
      const testEmail = generateUniqueEmail();
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', initialCookies)
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
      let authCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      let allCookies = [...initialCookies, ...authCookies];

      // 2. Verify initial session
      const initialSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(initialSession).toBeDefined();
      expect(initialSession.userId).toBe(userId);
      expect(initialSession.deviceId).toBe(deviceId);

      // Store initial token for comparison
      const initialToken = initialSession.token;

      // 3. Perform several token refreshes in sequence
      const refreshCount = 5;
      const tokens = [initialToken];

      for (let i = 0; i < refreshCount; i++) {
        // Small delay between refreshes to ensure distinct timestamps
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Refresh the token
        const refreshResponse = await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Cookie', allCookies)
          .set('x-csrf-token', csrfToken)
          .expect(200);

        // Update cookies with new tokens
        authCookies = refreshResponse.headers[
          'set-cookie'
        ] as unknown as string[];
        allCookies = [
          ...initialCookies.filter(
            (c) =>
              !c.startsWith('accessToken=') && !c.startsWith('refreshToken='),
          ),
          ...authCookies,
        ];

        // Get the updated session
        const updatedSession = await sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        });

        // Verify session is still valid
        expect(updatedSession).toBeDefined();
        expect(updatedSession.userId).toBe(userId);
        expect(updatedSession.deviceId).toBe(deviceId);

        // Store token for comparison
        tokens.push(updatedSession.token);

        // Verify the token has changed
        expect(updatedSession.token).not.toBe(initialToken);

        // Verify user data is returned correctly
        expect(refreshResponse.body).toEqual({
          id: userId,
          email: testEmail,
          name: 'Test User',
        });

        // Verify we can access protected resources with the new token
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', allCookies)
          .set('x-csrf-token', csrfToken)
          .expect(200);
      }

      // 4. Verify all tokens are unique (proper rotation)
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(refreshCount + 1); // Initial token + refreshed tokens

      // 5. Verify the final session is still valid
      const finalSession = await sessionService.getValidSession({
        userId,
        deviceId: deviceId!,
      });
      expect(finalSession).toBeDefined();
      expect(finalSession.token).toBe(tokens[tokens.length - 1]);

      // 6. Sign out to clean up
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', allCookies)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      // 7. Verify session is invalidated
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: deviceId!,
        }),
      ).rejects.toThrow('Failed to validate session');
    });

    it('should maintain session across multiple devices', async () => {
      // Get services from test utils
      app = testUtils.getApp();
      sessionService = testUtils.getSessionService();
      userService = testUtils.getUserService();

      // 1. Create a user and get CSRF token for the first device
      const device1Response = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const device1CsrfToken = device1Response.body.token;
      const device1Cookies = device1Response.headers[
        'set-cookie'
      ] as unknown as string[];
      const device1Id = device1Cookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];

      expect(device1Id).toBeDefined();
      expect(device1CsrfToken).toBeDefined();

      // 2. Create a second device
      const device2Response = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const device2CsrfToken = device2Response.body.token;
      const device2Cookies = device2Response.headers[
        'set-cookie'
      ] as unknown as string[];
      const device2Id = device2Cookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];

      expect(device2Id).toBeDefined();
      expect(device2CsrfToken).toBeDefined();

      // Verify we have two different device IDs
      expect(device1Id).not.toBe(device2Id);

      // 3. Register a new user on first device
      const testEmail = generateUniqueEmail();
      const testPassword = 'Password123!';
      const testName = 'Test User';

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', device1Cookies)
        .set('x-csrf-token', device1CsrfToken)
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        })
        .expect(201);

      const userId = signupResponse.body.id;
      expect(userId).toBeDefined();

      // Get auth cookies for device 1
      const device1AuthCookies = signupResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const device1AllCookies = [...device1Cookies, ...device1AuthCookies];

      // 4. Verify user has a valid session on the first device
      let device1Session = await sessionService.getValidSession({
        userId,
        deviceId: device1Id!,
      });
      expect(device1Session).toBeDefined();
      expect(device1Session.userId).toBe(userId);
      expect(device1Session.deviceId).toBe(device1Id);

      // 5. Login same user on second device
      const signinResponse = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', device2Cookies)
        .set('x-csrf-token', device2CsrfToken)
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      // Get auth cookies for device 2
      const device2AuthCookies = signinResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const device2AllCookies = [...device2Cookies, ...device2AuthCookies];

      // 6. Verify user now has TWO valid sessions - one for each device
      const device2Session = await sessionService.getValidSession({
        userId,
        deviceId: device2Id!,
      });
      expect(device2Session).toBeDefined();
      expect(device2Session.userId).toBe(userId);
      expect(device2Session.deviceId).toBe(device2Id);

      // Re-check device 1 session is still valid
      device1Session = await sessionService.getValidSession({
        userId,
        deviceId: device1Id!,
      });
      expect(device1Session).toBeDefined();

      // 7. Verify both sessions have different tokens
      expect(device1Session.token).not.toBe(device2Session.token);

      // 8. Refresh tokens on both devices
      const device1RefreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', device1AllCookies)
        .set('x-csrf-token', device1CsrfToken)
        .expect(200);

      const device2RefreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', device2AllCookies)
        .set('x-csrf-token', device2CsrfToken)
        .expect(200);

      // 9. Update cookies for both devices
      const device1NewAuthCookies = device1RefreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const device1NewAllCookies = [
        ...device1Cookies.filter(
          (c) =>
            !c.startsWith('accessToken=') && !c.startsWith('refreshToken='),
        ),
        ...device1NewAuthCookies,
      ];

      const device2NewAuthCookies = device2RefreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const device2NewAllCookies = [
        ...device2Cookies.filter(
          (c) =>
            !c.startsWith('accessToken=') && !c.startsWith('refreshToken='),
        ),
        ...device2NewAuthCookies,
      ];

      // 10. Verify both sessions are still valid and tokens have changed
      const device1UpdatedSession = await sessionService.getValidSession({
        userId,
        deviceId: device1Id!,
      });
      const device2UpdatedSession = await sessionService.getValidSession({
        userId,
        deviceId: device2Id!,
      });

      expect(device1UpdatedSession).toBeDefined();
      expect(device2UpdatedSession).toBeDefined();
      expect(device1UpdatedSession.token).not.toBe(device1Session.token);
      expect(device2UpdatedSession.token).not.toBe(device2Session.token);

      // 11. Signout on device 1 and verify only that session is invalidated
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', device1NewAllCookies)
        .set('x-csrf-token', device1CsrfToken)
        .expect(200);

      // Device 1 session should be invalidated
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: device1Id!,
        }),
      ).rejects.toThrow('Failed to validate session');

      // Device 2 session should still be valid
      const device2StillValid = await sessionService.getValidSession({
        userId,
        deviceId: device2Id!,
      });
      expect(device2StillValid).toBeDefined();
      expect(device2StillValid.userId).toBe(userId);
      expect(device2StillValid.deviceId).toBe(device2Id);

      // 12. Protected routes should still work on device 2
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', device2NewAllCookies)
        .set('x-csrf-token', device2CsrfToken)
        .expect(200);

      // 13. Sign out from device 2 as well
      await request(app.getHttpServer())
        .post('/auth/signout')
        .set('Cookie', device2NewAllCookies)
        .set('x-csrf-token', device2CsrfToken)
        .expect(200);

      // Device 2 session should now be invalidated too
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: device2Id!,
        }),
      ).rejects.toThrow('Failed to validate session');
    });

    it('should handle device migration (same user, new device)', async () => {
      // Get services from test utils
      app = testUtils.getApp();
      sessionService = testUtils.getSessionService();
      userService = testUtils.getUserService();

      // 1. Setup initial device and create user
      const initialDeviceResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const initialCsrfToken = initialDeviceResponse.body.token;
      const initialDeviceCookies = initialDeviceResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const initialDeviceId = initialDeviceCookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];

      expect(initialDeviceId).toBeDefined();
      expect(initialCsrfToken).toBeDefined();

      // 2. Register a new user on the initial device
      const testEmail = generateUniqueEmail();
      const testPassword = 'Password123!';
      const testName = 'Device Migration User';

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Cookie', initialDeviceCookies)
        .set('x-csrf-token', initialCsrfToken)
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        })
        .expect(201);

      const userId = signupResponse.body.id;
      expect(userId).toBeDefined();

      // Verify initial session was created
      const initialSession = await sessionService.getValidSession({
        userId,
        deviceId: initialDeviceId!,
      });
      expect(initialSession).toBeDefined();
      expect(initialSession.userId).toBe(userId);
      expect(initialSession.deviceId).toBe(initialDeviceId);

      // 3. Simulate time passing and user getting a new device
      // by creating a new device ID
      const newDeviceResponse = await request(app.getHttpServer())
        .post('/auth/csrf-token')
        .expect(200);

      const newDeviceCsrfToken = newDeviceResponse.body.token;
      const newDeviceCookies = newDeviceResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const newDeviceId = newDeviceCookies
        .find((c) => c.startsWith('deviceId='))
        ?.split('=')[1]
        ?.split(';')[0];

      expect(newDeviceId).toBeDefined();
      expect(newDeviceCsrfToken).toBeDefined();
      expect(newDeviceId).not.toBe(initialDeviceId);

      // 4. Sign in on the new device
      const signinResponse = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Cookie', newDeviceCookies)
        .set('x-csrf-token', newDeviceCsrfToken)
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const newDeviceAuthCookies = signinResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const newDeviceAllCookies = [
        ...newDeviceCookies,
        ...newDeviceAuthCookies,
      ];

      // 5. Verify new session was created
      const newDeviceSession = await sessionService.getValidSession({
        userId,
        deviceId: newDeviceId!,
      });
      expect(newDeviceSession).toBeDefined();
      expect(newDeviceSession.userId).toBe(userId);
      expect(newDeviceSession.deviceId).toBe(newDeviceId);

      // 6. Verify the initial session still exists (maintaining both devices)
      const initialSessionStillValid = await sessionService.getValidSession({
        userId,
        deviceId: initialDeviceId!,
      });
      expect(initialSessionStillValid).toBeDefined();

      // 7. Use an authenticated route on the new device
      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', newDeviceAllCookies)
        .set('x-csrf-token', newDeviceCsrfToken)
        .expect(200);

      expect(meResponse.body).toEqual({
        id: userId,
        email: testEmail,
        name: testName,
      });

      // 8. Test the session limit by creating multiple additional devices
      // The system should maintain up to MAX_SESSIONS_PER_USER (which is 5)
      // and remove the oldest ones when exceeded

      // Store all deviceIds to check which ones get removed
      const allDeviceIds = [initialDeviceId, newDeviceId];

      // Create 4 more devices (total will be 6, exceeding the limit of 5)
      for (let i = 0; i < 4; i++) {
        // Create a new device
        const extraDeviceResponse = await request(app.getHttpServer())
          .post('/auth/csrf-token')
          .expect(200);

        const extraDeviceCsrfToken = extraDeviceResponse.body.token;
        const extraDeviceCookies = extraDeviceResponse.headers[
          'set-cookie'
        ] as unknown as string[];
        const extraDeviceId = extraDeviceCookies
          .find((c) => c.startsWith('deviceId='))
          ?.split('=')[1]
          ?.split(';')[0];

        expect(extraDeviceId).toBeDefined();

        // Sign in on the extra device
        await request(app.getHttpServer())
          .post('/auth/signin')
          .set('Cookie', extraDeviceCookies)
          .set('x-csrf-token', extraDeviceCsrfToken)
          .send({
            email: testEmail,
            password: testPassword,
          })
          .expect(200);

        allDeviceIds.push(extraDeviceId);

        // Small delay to ensure lastUsedAt timestamps are different
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // 9. After creating 6 total sessions, the oldest one should be removed
      // since MAX_SESSIONS_PER_USER is 5
      await expect(
        sessionService.getValidSession({
          userId,
          deviceId: allDeviceIds[0]!,
        }),
      ).rejects.toThrow('Failed to validate session');

      // But the second oldest and newer sessions should still be valid
      for (let i = 1; i < allDeviceIds.length; i++) {
        const session = await sessionService.getValidSession({
          userId,
          deviceId: allDeviceIds[i]!,
        });
        expect(session).toBeDefined();
        expect(session.userId).toBe(userId);
        expect(session.deviceId).toBe(allDeviceIds[i]);
      }

      // 10. Count active sessions by trying to access each one
      // Since the service doesn't expose a public method to get all user sessions,
      // we'll check each device ID to see which ones are still valid
      let activeSessionCount = 0;
      for (const deviceId of allDeviceIds) {
        try {
          await sessionService.getValidSession({
            userId,
            deviceId: deviceId!,
          });
          activeSessionCount++;
        } catch (error) {
          // Session not valid, which is expected for the oldest one
        }
      }

      // We should have exactly MAX_SESSIONS_PER_USER (5) active sessions
      expect(activeSessionCount).toBe(5);
    });
  });
});
