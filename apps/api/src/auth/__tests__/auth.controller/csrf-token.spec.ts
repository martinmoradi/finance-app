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
  });

  describe('POST /csrf-token', () => {
    it('should call csrfProvider.generateToken with request and response', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      context.controller.generateCsrfToken(mockReq, mockRes);

      expect(context.mockCsrfProvider.generateToken).toHaveBeenCalledWith(
        mockReq,
        mockRes,
      );
    });

    it('should call cookieService.getOrCreateDeviceId with request and response', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      context.controller.generateCsrfToken(mockReq, mockRes);

      expect(
        context.mockCookieService.getOrCreateDeviceId,
      ).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should return response with token and deviceId', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const expectedToken = 'test-csrf-token';
      const expectedDeviceId = 'test-device-id';

      context.mockCsrfProvider.generateToken.mockReturnValue(expectedToken);
      context.mockCookieService.getOrCreateDeviceId.mockReturnValue(
        expectedDeviceId,
      );

      context.controller.generateCsrfToken(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        token: expectedToken,
        deviceId: expectedDeviceId,
      });
    });
  });
});
