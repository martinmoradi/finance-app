/**
 * Parses duration strings into milliseconds.
 *
 * @param duration - Duration string (e.g., "7d", "24h", "60m", "3600s")
 * @returns Number of milliseconds
 * @throws {Error} When duration format is invalid
 */
export function parseDuration(duration: string): number {
  const unit = duration.slice(-1);
  const valueStr = duration.slice(0, -1);
  const value = parseInt(valueStr);

  if (isNaN(value) || value.toString() !== valueStr || value < 0) {
    throw new Error(`Invalid duration value: ${valueStr}`);
  }

  if (!Number.isSafeInteger(value)) {
    throw new Error(`Value exceeds safe integer range: ${valueStr}`);
  }

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}
