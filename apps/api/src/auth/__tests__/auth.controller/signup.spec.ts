import { BadRequestException } from '@nestjs/common';
import {
  TestContext,
  createMockRequest,
  createMockResponse,
  setupTestModule,
} from './auth-controller.helper';

describe('AuthController', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
    // Add default mock implementation for signup
    const mockAuthTokens: [string, string] = [
      'mock-access-token',
      'mock-refresh-token',
    ];
    context.mockAuthService.signup.mockResolvedValue([
      { id: '1', email: 'test@example.com', name: 'Test User' },
      mockAuthTokens,
    ]);
  });

  describe('POST /signup', () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should call authService.signup and set auth cookies', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const deviceId = 'mock-device-id';

      context.mockCookieService.getOrCreateDeviceId.mockReturnValue(deviceId);

      // Act
      await context.controller.signup(createUserDto, req, res);

      // Assert
      expect(
        context.mockCookieService.getOrCreateDeviceId,
      ).toHaveBeenCalledWith(req, res);
      expect(context.mockAuthService.signup).toHaveBeenCalledWith(
        createUserDto,
        deviceId,
      );

      const mockAuthTokens = ['mock-access-token', 'mock-refresh-token'];
      expect(context.mockCookieService.setAuthCookies).toHaveBeenCalledWith(
        res,
        mockAuthTokens,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
    });
  });
});
