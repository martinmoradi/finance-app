import { parseDuration } from '@/utils/parse-duration';

describe('parseDuration', () => {
  describe('valid durations', () => {
    // Organized by unit type for better coverage
    describe('days', () => {
      it('should parse days correctly', () => {
        expect(parseDuration('1d')).toBe(86400000);
        expect(parseDuration('7d')).toBe(7 * 86400000);
      });
    });

    describe('hours', () => {
      it('should parse hours correctly', () => {
        expect(parseDuration('24h')).toBe(86400000);
        expect(parseDuration('1000h')).toBe(1000 * 3600000);
      });
    });

    describe('minutes', () => {
      it('should parse minutes correctly', () => {
        expect(parseDuration('60m')).toBe(3600000);
        expect(parseDuration('12345m')).toBe(12345 * 60000);
      });
    });

    describe('seconds', () => {
      it('should parse seconds correctly', () => {
        expect(parseDuration('60s')).toBe(60000);
        expect(parseDuration('0s')).toBe(0);
      });
    });
  });

  describe('invalid durations', () => {
    describe('invalid unit', () => {
      it('should throw error for invalid unit', () => {
        // Using try-catch for better coverage
        try {
          parseDuration('10x');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toBe('Invalid duration unit: x');
        }
      });

      it('should throw error for numeric-only input', () => {
        try {
          parseDuration('100');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toBe('Invalid duration unit: 0');
        }
      });
    });

    describe('invalid value formats', () => {
      it('should throw error for non-integer value', () => {
        try {
          parseDuration('5.5h');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toBe('Invalid duration value: 5.5');
        }
      });

      it('should throw error for non-numeric value', () => {
        try {
          parseDuration('abc');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toBe('Invalid duration value: ab');
        }
      });

      it('should throw error for empty string', () => {
        try {
          parseDuration('');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toBe('Invalid duration value: ');
        }
      });

      it('should throw error for leading zeros', () => {
        try {
          parseDuration('01h');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toBe('Invalid duration value: 01');
        }
      });

      it('should throw error for negative values', () => {
        try {
          parseDuration('-5m');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toBe('Invalid duration value: -5');
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle maximum safe integer', () => {
      const maxSafe = (2 ** 53 - 1).toString();
      const result = parseDuration(`${maxSafe}d`);
      expect(result).toBe(Number(maxSafe) * 86400000);
    });

    it('should throw for numbers exceeding safe integer', () => {
      const unsafe = (2 ** 53).toString();
      try {
        parseDuration(`${unsafe}d`);
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe(
          `Value exceeds safe integer range: ${unsafe}`,
        );
      }
    });
  });
});
