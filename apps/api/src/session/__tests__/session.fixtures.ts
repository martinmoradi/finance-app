import { DatabaseSession } from '@repo/types';
import { CreateSession } from '@repo/validation';

// Input data for creating sessions
export const mockSessionData = {
  userId: 'user123',
  deviceId: 'device123',
  refreshToken: 'refresh123',
  expiresAt: new Date('2025-01-15'),
} as const;

// Data for creating database sessions
export const mockDatabaseSessionData: CreateSession = {
  userId: mockSessionData.userId,
  deviceId: mockSessionData.deviceId,
  token: `hashed_${mockSessionData.refreshToken}`,
  expiresAt: mockSessionData.expiresAt,
};

export function createMockSession(
  overrides: Partial<DatabaseSession> = {},
  now: Date = new Date('2025-01-01'),
): DatabaseSession {
  return {
    userId: mockSessionData.userId,
    deviceId: mockSessionData.deviceId,
    token: mockDatabaseSessionData.token,
    expiresAt: mockSessionData.expiresAt,
    createdAt: now,
    lastUsedAt: now,
    ...overrides,
  };
}
