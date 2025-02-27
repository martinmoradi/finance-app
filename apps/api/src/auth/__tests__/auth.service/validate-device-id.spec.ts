import { InvalidDeviceIdException } from '@/auth/exceptions';
import {
  TestContext,
  mockDeviceIds,
  setupTestModule,
} from './auth-service.helper';

describe('AuthService', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestModule();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDeviceId', () => {
    it('should not throw exception for valid UUID v4 format', () => {
      // Test with a valid UUID v4
      expect(() => {
        context.authService.validateDeviceId(mockDeviceIds.valid);
      }).not.toThrow();

      // Test with another valid UUID v4
      expect(() => {
        context.authService.validateDeviceId(mockDeviceIds.validAlt);
      }).not.toThrow();
    });

    it('should throw InvalidDeviceIdException for invalid UUID format', () => {
      // Test with a completely invalid format
      expect(() => {
        context.authService.validateDeviceId(mockDeviceIds.invalidFormat);
      }).toThrow(InvalidDeviceIdException);

      // Test with an invalid UUID version
      expect(() => {
        context.authService.validateDeviceId(mockDeviceIds.invalidVersion);
      }).toThrow(InvalidDeviceIdException);
    });

    it('should log warning when device ID is invalid', () => {
      // Try with invalid format
      try {
        context.authService.validateDeviceId(mockDeviceIds.invalidFormat);
      } catch (error) {
        // Expected to throw
      }

      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'Invalid device ID format',
        expect.objectContaining({
          deviceId: mockDeviceIds.invalidFormat,
        }),
      );

      // Reset mock to check warning for invalid version
      jest.clearAllMocks();

      // Try with invalid version
      try {
        context.authService.validateDeviceId(mockDeviceIds.invalidVersion);
      } catch (error) {
        // Expected to throw
      }

      expect(context.loggerService.warn).toHaveBeenCalledWith(
        'Invalid device ID format',
        expect.objectContaining({
          deviceId: mockDeviceIds.invalidVersion,
        }),
      );
    });
  });
});
