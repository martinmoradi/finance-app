import { DatabaseSession } from '@repo/types';

export const mockSessionData = {
  userId: 'user123',
  deviceId: 'device123',
  refreshToken: 'refresh123',
  hashedRefreshToken: 'hashed_refresh123',
  expiresAt: new Date('2025-01-15'), // 15 days from now
};

export function createMockSession(
  overrides: Partial<DatabaseSession> = {},
  now: Date = new Date('2025-01-01'),
): DatabaseSession {
  return {
    userId: mockSessionData.userId,
    deviceId: mockSessionData.deviceId,
    token: mockSessionData.hashedRefreshToken,
    expiresAt: mockSessionData.expiresAt,
    createdAt: now,
    lastUsedAt: now,
    ...overrides,
  };
}
