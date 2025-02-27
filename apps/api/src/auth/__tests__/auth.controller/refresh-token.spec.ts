import { PublicUser } from '@repo/types';
import {
  TestContext,
  createMockRequestWithUser,
  createMockResponse,
  setupTestModule,
} from './auth-controller.helper';

describe('AuthController', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
  });

  describe('POST /refresh-token', () => {
    const mockUser: PublicUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should refresh tokens and set new auth cookies', async () => {
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = createMockResponse();

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      // Set up the mock to return the expected device ID
      context.mockCookieService.getOrCreateDeviceId.mockReturnValue(
        'test-device-id',
      );

      context.mockAuthService.refreshTokens.mockResolvedValue([
        mockUser,
        [mockTokens.accessToken, mockTokens.refreshToken],
      ]);

      await context.controller.refreshToken(mockReq, mockRes);

      expect(context.mockAuthService.refreshTokens).toHaveBeenCalledWith(
        mockUser,
        'test-device-id',
      );
      expect(context.mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        mockRes,
        [mockTokens.accessToken, mockTokens.refreshToken],
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it('should handle token refresh failure', async () => {
      const mockReq = createMockRequestWithUser({}, mockUser);
      const mockRes = createMockResponse();

      const error = new Error('Token refresh failed');
      context.mockAuthService.refreshTokens.mockRejectedValue(error);

      await expect(
        context.controller.refreshToken(mockReq, mockRes),
      ).rejects.toThrow(error);
    });

    it('should handle missing user in request', async () => {
      const mockReq = createMockRequestWithUser(
        {},
        undefined as unknown as PublicUser,
      );
      const mockRes = createMockResponse();

      await expect(
        context.controller.refreshToken(mockReq, mockRes),
      ).rejects.toThrow();
    });
  });
});
