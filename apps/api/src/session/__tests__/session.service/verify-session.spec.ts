import { SessionValidationException } from '@/session/exceptions';
import { setupSessionTests } from '@/session/__tests__/session.service/session.service.helper';

describe('SessionService', () => {
  const { getService, getMockSession, mockSessionData } = setupSessionTests();

  describe('verifySession', () => {
    it('should call getValidSession with correct parameters', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const mockSession = getMockSession();

      // Spy on the getValidSession method
      const getValidSessionSpy = jest.spyOn(service, 'getValidSession');
      getValidSessionSpy.mockResolvedValue(mockSession);

      await service.verifySession(userId, deviceId);

      expect(getValidSessionSpy).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should return void when session is valid', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();
      const mockSession = getMockSession();

      // Mock getValidSession to return a valid session
      jest.spyOn(service, 'getValidSession').mockResolvedValue(mockSession);

      // The method should return void (undefined)
      const result = await service.verifySession(userId, deviceId);

      expect(result).toBeUndefined();
    });

    it('should propagate exceptions from getValidSession', async () => {
      const { userId, deviceId } = mockSessionData;
      const service = getService();

      // Create a validation exception to be thrown
      const validationError = new SessionValidationException(
        new Error('Session validation failed'),
      );

      // Mock getValidSession to throw an exception
      jest.spyOn(service, 'getValidSession').mockRejectedValue(validationError);

      // Expect the same exception to be propagated
      await expect(service.verifySession(userId, deviceId)).rejects.toThrow(
        validationError,
      );

      try {
        await service.verifySession(userId, deviceId);
        fail('Expected SessionValidationException was not thrown');
      } catch (error) {
        expect(error).toBe(validationError);
      }
    });
  });
});
