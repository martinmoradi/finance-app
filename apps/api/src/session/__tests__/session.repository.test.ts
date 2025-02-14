import { Test } from '@nestjs/testing';
import { and, eq, lt, sessions, schema } from '@repo/database';
import type { DatabaseSession } from '@repo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionRepository } from '../session.repository';

// Mock session data
const sessionFixtures: DatabaseSession[] = [
  {
    userId: 'user1',
    deviceId: 'device1',
    token: 'token1',
    expiresAt: new Date('2025-12-31'),
    lastUsedAt: new Date(),
    createdAt: new Date(),
  },
  {
    userId: 'user1',
    deviceId: 'device2',
    token: 'token2',
    expiresAt: new Date('2025-12-31'),
    lastUsedAt: new Date(),
    createdAt: new Date(),
  },
];

// Mock database instance with spies for all required methods
const mockDb = {
  query: {
    sessions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

/**
 * Mock the BaseRepository class to return our mock database instance
 */
vi.mock('@/database/base.repository', () => {
  return {
    BaseRepository: class {
      protected get db(): typeof mockDb {
        return mockDb;
      }
    },
  };
});

describe('SessionRepository', () => {
  let sessionRepository: SessionRepository;

  /**
   * Before each test:
   * 1. Create a new NestJS testing module with SessionRepository
   * 2. Get an instance of SessionRepository
   * 3. Reset all mocks
   */
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SessionRepository],
    }).compile();

    sessionRepository = moduleRef.get<SessionRepository>(SessionRepository);

    // Reset mocks before each test
    vi.clearAllMocks();
  });

  /**
   * Test suite for create() method
   */
  describe('create', () => {
    it('should create a new session', async () => {
      const newSession: DatabaseSession = {
        userId: 'user1',
        deviceId: 'device1',
        token: 'token1',
        expiresAt: new Date('2025-12-31'),
        lastUsedAt: new Date(),
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([sessionFixtures[0]]);

      const createdSession = await sessionRepository.create(newSession);

      expect(mockDb.insert).toHaveBeenCalledWith(sessions);
      expect(mockDb.values).toHaveBeenCalledWith(newSession);
      expect(createdSession).toEqual(sessionFixtures[0]);
    });

    it('should return null when session creation fails', async () => {
      mockDb.returning.mockResolvedValue([]);

      const newSession = {
        userId: 'user1',
        deviceId: 'device1',
        token: 'token1',
        expiresAt: new Date('2025-12-31'),
      };

      const createdSession = await sessionRepository.create(newSession);
      expect(createdSession).toBeNull();
    });
  });

  /**
   * Test suite for findOne() method
   */
  describe('findOne', () => {
    it('should find session by userId and deviceId', async () => {
      mockDb.query.sessions.findFirst.mockResolvedValue(sessionFixtures[0]);

      const session = await sessionRepository.findOne('user1', 'device1');

      expect(mockDb.query.sessions.findFirst).toHaveBeenCalledWith({
        where: and(
          eq(sessions.userId, 'user1'),
          eq(sessions.deviceId, 'device1'),
        ),
      });
      expect(session).toEqual(sessionFixtures[0]);
    });

    it('should return null when session not found', async () => {
      mockDb.query.sessions.findFirst.mockResolvedValue(null);

      const session = await sessionRepository.findOne('nonexistent', 'device1');
      expect(session).toBeNull();
    });

    it('should handle empty deviceId', async () => {
      const result = await sessionRepository.findOne('user1', '');
      expect(result).toBeNull();
    });

    it('should handle empty userId', async () => {
      const result = await sessionRepository.findOne('', 'device1');
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.sessions.findFirst.mockRejectedValue(new Error('DB Error'));

      await expect(
        sessionRepository.findOne('user1', 'device1'),
      ).rejects.toThrow('DB Error');
    });
  });

  /**
   * Test suite for findAllByUserId() method
   */
  describe('findAllByUserId', () => {
    it('should find all sessions for a user', async () => {
      mockDb.query.sessions.findMany.mockResolvedValue(sessionFixtures);

      const sessions = await sessionRepository.findAllByUserId('user1');

      expect(mockDb.query.sessions.findMany).toHaveBeenCalledWith({
        where: eq(schema.sessions.userId, 'user1'),
      });
      expect(sessions).toEqual(sessionFixtures);
    });

    it('should return empty array when no sessions found', async () => {
      mockDb.query.sessions.findMany.mockResolvedValue([]);

      const sessions = await sessionRepository.findAllByUserId('nonexistent');
      expect(sessions).toEqual([]);
    });
  });

  /**
   * Test suite for updateLastUsedAt() method
   */
  describe('updateLastUsedAt', () => {
    it('should update lastUsedAt timestamp', async () => {
      mockDb.returning.mockResolvedValue([
        { ...sessionFixtures[0], lastUsedAt: new Date() },
      ]);

      const updatedSession = await sessionRepository.updateLastUsedAt(
        'user1',
        'device1',
      );

      expect(mockDb.update).toHaveBeenCalledWith(sessions);
      expect(mockDb.set).toHaveBeenCalledWith({ lastUsedAt: expect.any(Date) });
      expect(updatedSession).toBeTruthy();
      expect(updatedSession?.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should return null when update fails', async () => {
      mockDb.returning.mockResolvedValue([]);

      const updatedSession = await sessionRepository.updateLastUsedAt(
        'nonexistent',
        'device1',
      );
      expect(updatedSession).toBeNull();
    });
  });

  /**
   * Test suite for delete() method
   */
  describe('delete', () => {
    it('should delete a specific session', async () => {
      mockDb.returning.mockResolvedValue([sessionFixtures[0]]);

      const deletedSession = await sessionRepository.delete('user1', 'device1');

      expect(mockDb.delete).toHaveBeenCalledWith(sessions);
      expect(mockDb.where).toHaveBeenCalledWith(
        and(eq(sessions.userId, 'user1'), eq(sessions.deviceId, 'device1')),
      );
      expect(deletedSession).toEqual(sessionFixtures[0]);
    });

    it('should return null when delete fails', async () => {
      mockDb.returning.mockResolvedValue([]);

      const deletedSession = await sessionRepository.delete(
        'nonexistent',
        'device1',
      );
      expect(deletedSession).toBeNull();
    });
  });

  /**
   * Test suite for deleteAllForUser() method
   */
  describe('deleteAllForUser', () => {
    it('should delete all sessions for a user', async () => {
      mockDb.returning.mockResolvedValue(sessionFixtures);

      const deletedSessions = await sessionRepository.deleteAllForUser('user1');

      expect(mockDb.delete).toHaveBeenCalledWith(sessions);
      expect(mockDb.where).toHaveBeenCalledWith(eq(sessions.userId, 'user1'));
      expect(deletedSessions).toEqual(sessionFixtures);
    });

    it('should return empty array when no sessions to delete', async () => {
      mockDb.returning.mockResolvedValue([]);

      const deletedSessions =
        await sessionRepository.deleteAllForUser('nonexistent');
      expect(deletedSessions).toEqual([]);
    });
  });

  /**
   * Test suite for deleteExpired() method
   */
  describe('deleteExpired', () => {
    it('should delete all expired sessions', async () => {
      const expiredSessions = [
        { ...sessionFixtures[0], expiresAt: new Date('2023-01-01') },
      ];
      mockDb.returning.mockResolvedValue(expiredSessions);

      const deletedSessions = await sessionRepository.deleteExpired();

      expect(mockDb.delete).toHaveBeenCalledWith(sessions);
      expect(mockDb.where).toHaveBeenCalledWith(
        lt(sessions.expiresAt, expect.any(Date) as Date),
      );
      expect(deletedSessions).toEqual(expiredSessions);
    });

    it('should return empty array when no expired sessions', async () => {
      mockDb.returning.mockResolvedValue([]);

      const deletedSessions = await sessionRepository.deleteExpired();
      expect(deletedSessions).toEqual([]);
    });
  });
});
