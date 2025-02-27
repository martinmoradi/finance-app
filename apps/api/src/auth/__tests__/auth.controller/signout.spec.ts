import { PublicUser } from '@repo/types';
import {
  TestContext,
  createMockRequest,
  createMockRequestWithUser,
  createMockResponse,
  setupTestModule,
} from './auth-controller.helper';

describe('AuthController', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
  });

  describe('POST /signout', () => {
    const mockUser: PublicUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should call authService.signout with user and deviceId', async () => {
      // Arrange
      const req = createMockRequestWithUser({}, mockUser);
      const res = createMockResponse();
      const deviceId = 'mock-device-id';
      context.mockCookieService.getOrCreateDeviceId.mockReturnValue(deviceId);

      // Act
      await context.controller.signout(req, res);

      // Assert
      expect(
        context.mockCookieService.getOrCreateDeviceId,
      ).toHaveBeenCalledWith(req, res);
      expect(context.mockAuthService.signout).toHaveBeenCalledWith(
        mockUser,
        deviceId,
      );
      expect(context.mockCookieService.clearAuthCookies).toHaveBeenCalledWith(
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully signed out',
      });
    });

    it('should call cookieService.clearAuthCookies with response', async () => {
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = createMockResponse();

      await context.controller.signout(mockReq, mockRes);

      expect(context.mockCookieService.clearAuthCookies).toHaveBeenCalledWith(
        mockRes,
      );
    });

    it('should return JSON response with success message', async () => {
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = createMockResponse();

      await context.controller.signout(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully signed out',
      });
    });

    it('should handle signout errors properly', async () => {
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = createMockResponse();

      const error = new Error('Signout failed');
      context.mockAuthService.signout.mockRejectedValue(error);

      await expect(
        context.controller.signout(mockReq, mockRes),
      ).rejects.toThrow(error);
    });
  });
});
