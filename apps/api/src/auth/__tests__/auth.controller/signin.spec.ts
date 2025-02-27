import { BadRequestException } from '@nestjs/common';
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

  describe('POST /signin', () => {
    const mockUser: PublicUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should call authService.signin and set auth cookies', async () => {
      // Arrange
      const mockUser: PublicUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const req = createMockRequestWithUser({}, mockUser);
      const res = createMockResponse();
      const deviceId = 'mock-device-id';
      const mockAuthTokens: [string, string] = [
        'mock-access-token',
        'mock-refresh-token',
      ];

      context.mockCookieService.getOrCreateDeviceId.mockReturnValue(deviceId);
      context.mockAuthService.signin.mockResolvedValue([
        mockUser,
        mockAuthTokens,
      ]);

      // Act
      await context.controller.signin(req, res);

      // Assert
      expect(
        context.mockCookieService.getOrCreateDeviceId,
      ).toHaveBeenCalledWith(req, res);
      expect(context.mockAuthService.signin).toHaveBeenCalledWith(
        mockUser,
        deviceId,
      );
      expect(context.mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        res,
        mockAuthTokens,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should handle signin errors properly', async () => {
      const mockReq = createMockRequestWithUser(
        { deviceId: 'test-device-id' },
        mockUser,
      );
      const mockRes = createMockResponse();

      const error = new Error('Authentication failed');
      context.mockAuthService.signin.mockRejectedValue(error);

      await expect(context.controller.signin(mockReq, mockRes)).rejects.toThrow(
        error,
      );
    });
  });
});
