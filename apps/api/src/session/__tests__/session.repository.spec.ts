import { Test } from '@nestjs/testing';
import { and, eq, lt, schema, sessions } from '@repo/database';
import type { DatabaseSession } from '@repo/types';
import { SessionRepository } from '../session.repository';
import {
  createMockSession,
  mockDatabaseSessionData,
  mockSessionData,
} from './session.fixtures';

const mockDb = {
  query: {
    sessions: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};

jest.mock('@/database/base.repository', () => {
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
  let mockSession: DatabaseSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SessionRepository],
    }).compile();

    sessionRepository = moduleRef.get<SessionRepository>(SessionRepository);
    mockSession = createMockSession();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new session', async () => {
      mockDb.returning.mockResolvedValue([mockSession]);

      const createdSession = await sessionRepository.create(
        mockDatabaseSessionData,
      );

      expect(mockDb.insert).toHaveBeenCalledWith(sessions);
      expect(mockDb.values).toHaveBeenCalledWith(mockDatabaseSessionData);
      expect(createdSession).toEqual(mockSession);
    });

    it('should return null when session creation fails', async () => {
      mockDb.returning.mockResolvedValue([]);

      const createdSession = await sessionRepository.create(
        mockDatabaseSessionData,
      );
      expect(createdSession).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find session by userId and deviceId', async () => {
      mockDb.query.sessions.findFirst.mockResolvedValue(mockSession);

      const session = await sessionRepository.findOne(
        mockSessionData.userId,
        mockSessionData.deviceId,
      );

      expect(mockDb.query.sessions.findFirst).toHaveBeenCalledWith({
        where: and(
          eq(sessions.userId, mockSessionData.userId),
          eq(sessions.deviceId, mockSessionData.deviceId),
        ),
      });
      expect(session).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      mockDb.query.sessions.findFirst.mockResolvedValue(null);
      const session = await sessionRepository.findOne('nonexistent', 'device1');
      expect(session).toBeNull();
    });
  });

  describe('findAllByUserId', () => {
    it('should find all sessions for a user', async () => {
      const mockSessions = [
        mockSession,
        createMockSession({ deviceId: 'device456' }),
      ];
      mockDb.query.sessions.findMany.mockResolvedValue(mockSessions);

      const sessions = await sessionRepository.findAllByUserId(
        mockSessionData.userId,
      );

      expect(mockDb.query.sessions.findMany).toHaveBeenCalledWith({
        where: eq(schema.sessions.userId, mockSessionData.userId),
      });
      expect(sessions).toEqual(mockSessions);
    });

    it('should return empty array when no sessions found', async () => {
      mockDb.query.sessions.findMany.mockResolvedValue([]);
      const sessions = await sessionRepository.findAllByUserId('nonexistent');
      expect(sessions).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update session fields', async () => {
      const updatedSession = createMockSession({
        lastUsedAt: new Date('2025-01-02'),
      });
      mockDb.returning.mockResolvedValue([updatedSession]);

      const updateData = {
        userId: mockSessionData.userId,
        deviceId: mockSessionData.deviceId,
        lastUsedAt: new Date(),
      };

      const result = await sessionRepository.update(updateData);

      expect(mockDb.update).toHaveBeenCalledWith(sessions);
      expect(mockDb.set).toHaveBeenCalledWith(updateData);
      expect(mockDb.where).toHaveBeenCalledWith(
        and(
          eq(sessions.userId, mockSessionData.userId),
          eq(sessions.deviceId, mockSessionData.deviceId),
        ),
      );
      expect(result).toEqual(updatedSession);
    });

    it('should return null when update fails', async () => {
      mockDb.returning.mockResolvedValue([]);

      const updateData = {
        userId: 'nonexistent',
        deviceId: 'device1',
        lastUsedAt: new Date(),
      };

      const result = await sessionRepository.update(updateData);
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a specific session', async () => {
      mockDb.returning.mockResolvedValue([mockSession]);

      const deletedSession = await sessionRepository.delete(
        mockSessionData.userId,
        mockSessionData.deviceId,
      );

      expect(mockDb.delete).toHaveBeenCalledWith(sessions);
      expect(mockDb.where).toHaveBeenCalledWith(
        and(
          eq(sessions.userId, mockSessionData.userId),
          eq(sessions.deviceId, mockSessionData.deviceId),
        ),
      );
      expect(deletedSession).toEqual(mockSession);
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

  describe('deleteAllForUser', () => {
    it('should delete all sessions for a user', async () => {
      const mockSessions = [
        mockSession,
        createMockSession({ deviceId: 'device456' }),
      ];
      mockDb.returning.mockResolvedValue(mockSessions);

      const deletedSessions = await sessionRepository.deleteAllForUser(
        mockSessionData.userId,
      );

      expect(mockDb.delete).toHaveBeenCalledWith(sessions);
      expect(mockDb.where).toHaveBeenCalledWith(
        eq(sessions.userId, mockSessionData.userId),
      );
      expect(deletedSessions).toEqual(mockSessions);
    });

    it('should return empty array when no sessions to delete', async () => {
      mockDb.returning.mockResolvedValue([]);
      const deletedSessions =
        await sessionRepository.deleteAllForUser('nonexistent');
      expect(deletedSessions).toEqual([]);
    });
  });

  describe('deleteExpired', () => {
    it('should delete all expired sessions', async () => {
      const expiredSession = createMockSession({
        expiresAt: new Date('2024-12-31'),
      });
      mockDb.returning.mockResolvedValue([expiredSession]);

      const deletedSessions = await sessionRepository.deleteExpired();

      expect(mockDb.delete).toHaveBeenCalledWith(sessions);
      expect(mockDb.where).toHaveBeenCalledWith(
        lt(sessions.expiresAt, expect.any(Date)),
      );
      expect(deletedSessions).toEqual([expiredSession]);
    });

    it('should return empty array when no expired sessions', async () => {
      mockDb.returning.mockResolvedValue([]);
      const deletedSessions = await sessionRepository.deleteExpired();
      expect(deletedSessions).toEqual([]);
    });
  });
});
