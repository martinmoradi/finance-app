import { parseDuration } from '@/utils/parse-duration';

describe('parseDuration', () => {
  describe('valid durations', () => {
    const testCases = [
      { input: '1d', expected: 86400000 },
      { input: '24h', expected: 86400000 },
      { input: '60m', expected: 3600000 },
      { input: '60s', expected: 60000 },
      { input: '0s', expected: 0 },
      { input: '7d', expected: 7 * 86400000 },
      { input: '1000h', expected: 1000 * 3600000 },
      { input: '12345m', expected: 12345 * 60000 },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should parse ${input} correctly`, () => {
        expect(parseDuration(input)).toBe(expected);
      });
    });
  });

  describe('invalid durations', () => {
    it('should throw error for invalid unit', () => {
      expect(() => parseDuration('10x')).toThrow('Invalid duration unit: x');
    });

    it('should throw error for non-integer value', () => {
      expect(() => parseDuration('5.5h')).toThrow(
        'Invalid duration value: 5.5',
      );
    });

    it('should throw error for non-numeric value', () => {
      expect(() => parseDuration('abc')).toThrow('Invalid duration value: ab');
    });

    it('should throw error for empty string', () => {
      expect(() => parseDuration('')).toThrow('Invalid duration value: ');
    });

    it('should throw error for missing unit', () => {
      expect(() => parseDuration('100')).toThrow('Invalid duration unit: ');
    });

    it('should throw error for leading zeros', () => {
      expect(() => parseDuration('01h')).toThrow('Invalid duration value: 01');
    });

    it('should throw error for negative values', () => {
      expect(() => parseDuration('-5m')).toThrow('Invalid duration value: -5');
    });
  });

  describe('edge cases', () => {
    it('should handle maximum safe integer', () => {
      const maxSafe = (2 ** 53 - 1).toString();
      expect(parseDuration(`${maxSafe}d`)).toBe(Number(maxSafe) * 86400000);
    });

    it('should throw for numbers exceeding safe integer', () => {
      const unsafe = (2 ** 53).toString();
      expect(() => parseDuration(`${unsafe}d`)).toThrow(
        'Value exceeds safe integer range',
      );
    });
  });
});
