import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRequiredEnvVar } from './env';

describe('Environment Variable Validation', () => {
  // Store the original process.env
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear and reset process.env before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore process.env after each test
    process.env = originalEnv;
  });

  describe('getRequiredEnvVar', () => {
    it('should return the value of an existing environment variable', () => {
      // Arrange
      const expectedValue = 'test-value';
      process.env.TEST_VAR = expectedValue;

      // Act
      const result = getRequiredEnvVar('TEST_VAR');

      // Assert
      expect(result).toBe(expectedValue);
    });

    it('should throw an error when environment variable is undefined', () => {
      // Arrange
      delete process.env.TEST_VAR;

      // Act & Assert
      expect(() => getRequiredEnvVar('TEST_VAR')).toThrow(
        'Environment variable TEST_VAR is required but was empty',
      );
    });

    it('should throw an error when environment variable is empty string', () => {
      // Arrange
      process.env.TEST_VAR = '';

      // Act & Assert
      expect(() => getRequiredEnvVar('TEST_VAR')).toThrow(
        'Environment variable TEST_VAR is required but was empty',
      );
    });

    it('should handle special characters in environment variable values', () => {
      // Arrange
      const specialValue = '!@#$%^&*()_+';
      process.env.SPECIAL_CHARS = specialValue;

      // Act
      const result = getRequiredEnvVar('SPECIAL_CHARS');

      // Assert
      expect(result).toBe(specialValue);
    });

    it('should handle numeric values as strings', () => {
      // Arrange
      process.env.PORT = '3000';

      // Act
      const result = getRequiredEnvVar('PORT');

      // Assert
      expect(result).toBe('3000');
      // Verify it's a string, not a number
      expect(typeof result).toBe('string');
    });
  });
});
