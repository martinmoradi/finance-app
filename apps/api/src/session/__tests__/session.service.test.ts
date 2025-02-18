import { LoggerService } from '@/logger/logger.service';
import {
  createMockSession,
  mockSessionData,
} from '@/session/__tests__/session.fixtures';
import {
  InvalidRefreshTokenException,
  SessionCreationFailedException,
  SessionExpiredException,
  SessionNotFoundException,
  SessionRepositoryException,
  SessionValidationException,
} from '@/session/exceptions';
import { SessionRepository } from '@/session/session.repository';
import { SessionService } from '@/session/session.service';
import { DatabaseSession } from '@repo/types';
import { hash, verify } from 'argon2';
import { fail } from 'assert';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock argon2
vi.mock('argon2', () => ({
  hash: vi
    .fn()
    .mockImplementation((token) => Promise.resolve(`hashed_${token}`)),
  verify: vi
    .fn()
    .mockImplementation((hashedToken, plainToken) =>
      Promise.resolve(hashedToken === `hashed_${plainToken}`),
    ),
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  let sessionRepository: SessionRepository;
  let loggerService: LoggerService;

  let fakeNow: Date;

  beforeEach(() => {
    // Create repository mock with void this context
    vi.clearAllMocks();
    vi.useFakeTimers();
    fakeNow = new Date('2025-01-01');
    vi.setSystemTime(fakeNow);

    sessionRepository = {
      findOne: vi.fn(function (this: void): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
      delete: vi.fn(function (this: void): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
      create: vi.fn(function (this: void): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
      updateLastUsedAt: vi.fn(function (
        this: void,
      ): Promise<DatabaseSession | null> {
        return Promise.resolve(null);
      }),
      findAllByUserId: vi.fn(function (this: void): Promise<DatabaseSession[]> {
        return Promise.resolve([]);
      }),
    } as unknown as SessionRepository;

    // Create logger mock with void this context
    loggerService = {
      warn: vi.fn(function (this: void): void {}),
      debug: vi.fn(function (this: void): void {}),
      info: vi.fn(function (this: void): void {}),
      error: vi.fn(function (this: void): void {}),
    } as unknown as LoggerService;

    // Initialize service with mocks
    sessionService = new SessionService(sessionRepository, loggerService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSessionWithToken', () => {
    const { userId, deviceId, refreshToken, expiresAt, hashedRefreshToken } =
      mockSessionData;
    const expectedSession = createMockSession();

    describe('success cases', () => {
      it('should create a new session when no existing session exists', async () => {
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([]); // No existing session
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedSession,
        );

        const result = await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        // Assertions
        expect(result.userId).toEqual(userId);
        expect(result.deviceId).toEqual(deviceId);
        expect(result.token).toEqual(hashedRefreshToken);
        expect(result.expiresAt).toEqual(expiresAt);
        expect(result.createdAt).toEqual(fakeNow);
        expect(result.lastUsedAt).toEqual(fakeNow);

        expect(loggerService.debug).toHaveBeenCalledWith(
          'Creating new session with token...',
          { userId, deviceId },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Session created successfully',
          { userId, deviceId },
        );
      });

      it('should create a new session after deleting existing one', async () => {
        const existingSession = createMockSession({
          expiresAt: new Date('2025-01-10'), // 10 days from now
          lastUsedAt: new Date('2024-12-29'), // 3 days ago
          createdAt: new Date('2024-12-27'), // 5 days ago
        });
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([
          existingSession,
        ]);
        vi.mocked(sessionRepository.delete).mockResolvedValueOnce(
          existingSession,
        );
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedSession,
        );

        const result = await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(result.userId).toEqual(userId);
        expect(result.deviceId).toEqual(deviceId);
        expect(result.token).toEqual(hashedRefreshToken);
        expect(result.expiresAt).toEqual(expiresAt);
        expect(result.createdAt).toEqual(new Date('2025-01-01'));
        expect(result.lastUsedAt).toEqual(new Date('2025-01-01'));

        // Verify logging
        expect(loggerService.debug).toHaveBeenCalledWith(
          'Creating new session with token...',
          { userId, deviceId },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Existing session found, deleting...',
          { userId, deviceId },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Session created successfully',
          { userId, deviceId },
        );
      });

      it('should create new session for a new device when user has 4 sessions on other devices', async () => {
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([
          createMockSession({ deviceId: 'device1' }),
          createMockSession({ deviceId: 'device2' }),
          createMockSession({ deviceId: 'device3' }),
          createMockSession({ deviceId: 'device4' }),
        ]);
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedSession,
        );

        // Execute
        const result = await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        // Assertions
        expect(result.userId).toEqual(userId);
        expect(result.deviceId).toEqual(deviceId);
        expect(result.token).toEqual(hashedRefreshToken);
        expect(result.expiresAt).toEqual(expiresAt);
        expect(result.createdAt).toEqual(fakeNow);
        expect(result.lastUsedAt).toEqual(fakeNow);

        expect(loggerService.debug).toHaveBeenCalledWith(
          'Creating new session with token...',
          { userId, deviceId },
        );
        // No existing session with the same deviceId found, so no deletion or cleanup should occur
        expect(loggerService.info).not.toHaveBeenCalledWith(
          'Existing session found, deleting...',
          { userId, deviceId },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Session created successfully',
          { userId, deviceId },
        );
      });

      it('should create new session with exactly MAX_SESSIONS_PER_USER existing sessions', async () => {
        const existingSessions = Array.from({ length: 5 }, (_, i) =>
          createMockSession({
            deviceId: `device${i + 1}`,
            lastUsedAt: new Date(`2024-12-${27 + i}`),
          }),
        );

        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce(
          existingSessions,
        );
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedSession,
        );

        await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        // Verify exactly one session was deleted (the oldest)
        expect(sessionRepository.delete).toHaveBeenCalledTimes(1);
        expect(sessionRepository.delete).toHaveBeenCalledWith(
          userId,
          'device1',
        );
      });

      it('should create new session and remove oldest when user has reached session limit', async () => {
        const oldestSession = createMockSession({
          deviceId: 'device1',
          lastUsedAt: new Date('2024-12-27'), // Oldest
          createdAt: new Date('2024-12-20'),
        });
        const existingSessions = [
          oldestSession,
          createMockSession({
            deviceId: 'device2',
            lastUsedAt: new Date('2024-12-28'),
          }),
          createMockSession({
            deviceId: 'device3',
            lastUsedAt: new Date('2024-12-29'),
          }),
          createMockSession({
            deviceId: 'device4',
            lastUsedAt: new Date('2024-12-30'),
          }),
          createMockSession({
            deviceId: 'device5',
            lastUsedAt: new Date('2024-12-31'),
          }),
        ];
        const expectedNewSession = createMockSession({
          deviceId,
          createdAt: new Date('2025-01-01'),
          lastUsedAt: new Date('2025-01-01'),
        });

        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce(
          existingSessions,
        );
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedNewSession,
        );
        vi.mocked(sessionRepository.delete).mockResolvedValueOnce(
          existingSessions[0]!,
        );
        const result = await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );
        // Verify the observable outcomes
        expect(result).toBeDefined();
        expect(result.userId).toBe(userId);
        expect(result.deviceId).toBe(deviceId);

        // Verify the oldest session was deleted
        expect(sessionRepository.delete).toHaveBeenCalledWith(
          userId,
          oldestSession.deviceId,
        );

        // Verify logging
        expect(loggerService.debug).toHaveBeenCalledWith(
          'Creating new session with token...',
          { userId, deviceId },
        );
        expect(loggerService.debug).toHaveBeenCalledWith(
          'Enforcing session limit...',
          { userId, maxSessions: 5 },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Removed oldest session due to limit',
          { userId, deviceId: 'device1' },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Session created successfully',
          { userId, deviceId },
        );
      });

      it('should handle cleanup of multiple sessions when well over the limit', async () => {
        // Create 7 existing sessions with different lastUsedAt timestamps
        const existingSessions = [
          createMockSession({
            deviceId: 'device1',
            lastUsedAt: new Date('2024-12-25'), // Oldest
            createdAt: new Date('2024-12-20'),
          }),
          createMockSession({
            deviceId: 'device2',
            lastUsedAt: new Date('2024-12-26'),
            createdAt: new Date('2024-12-21'),
          }),
          createMockSession({
            deviceId: 'device3',
            lastUsedAt: new Date('2024-12-27'),
            createdAt: new Date('2024-12-22'),
          }),
          createMockSession({
            deviceId: 'device4',
            lastUsedAt: new Date('2024-12-28'),
            createdAt: new Date('2024-12-23'),
          }),
          createMockSession({
            deviceId: 'device5',
            lastUsedAt: new Date('2024-12-29'),
            createdAt: new Date('2024-12-24'),
          }),
          createMockSession({
            deviceId: 'device6',
            lastUsedAt: new Date('2024-12-30'),
            createdAt: new Date('2024-12-25'),
          }),
          createMockSession({
            deviceId: 'device7',
            lastUsedAt: new Date('2024-12-31'),
            createdAt: new Date('2024-12-26'),
          }),
        ];

        const expectedNewSession = createMockSession({
          deviceId,
          createdAt: new Date('2025-01-01'),
          lastUsedAt: new Date('2025-01-01'),
        });

        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce(
          existingSessions,
        );
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedNewSession,
        );

        // Mock successful deletion of oldest sessions
        vi.mocked(sessionRepository.delete)
          .mockResolvedValueOnce(existingSessions[0]!) // device1
          .mockResolvedValueOnce(existingSessions[1]!) // device2
          .mockResolvedValueOnce(existingSessions[2]!); // device3

        const result = await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        // Verify the new session was created
        expect(result).toBeDefined();
        expect(result.userId).toBe(userId);
        expect(result.deviceId).toBe(deviceId);

        // Verify the three oldest sessions were deleted in order
        expect(sessionRepository.delete).toHaveBeenCalledTimes(3);
        expect(sessionRepository.delete).toHaveBeenNthCalledWith(
          1,
          userId,
          'device1',
        );
        expect(sessionRepository.delete).toHaveBeenNthCalledWith(
          2,
          userId,
          'device2',
        );
        expect(sessionRepository.delete).toHaveBeenNthCalledWith(
          3,
          userId,
          'device3',
        );

        // Verify logging
        expect(loggerService.debug).toHaveBeenCalledWith(
          'Creating new session with token...',
          { userId, deviceId },
        );
        expect(loggerService.debug).toHaveBeenCalledWith(
          'Enforcing session limit...',
          { userId, maxSessions: 5 },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Removed oldest session due to limit',
          { userId, deviceId: 'device1' },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Removed oldest session due to limit',
          { userId, deviceId: 'device2' },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Removed oldest session due to limit',
          { userId, deviceId: 'device3' },
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          'Session created successfully',
          { userId, deviceId },
        );
      });

      it('should preserve newer sessions when cleaning up old ones', async () => {
        const newerSessions = [
          createMockSession({
            deviceId: 'device1',
            lastUsedAt: new Date('2024-12-31'),
            createdAt: new Date('2024-12-30'),
          }),
          createMockSession({
            deviceId: 'device2',
            lastUsedAt: new Date('2024-12-30'),
            createdAt: new Date('2024-12-29'),
          }),
        ];

        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([
          ...newerSessions,
          createMockSession({
            deviceId: 'device3',
            lastUsedAt: new Date('2024-12-25'),
            createdAt: new Date('2024-12-20'),
          }),
        ]);
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedSession,
        );

        await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        // Verify newer sessions were preserved
        expect(sessionRepository.delete).not.toHaveBeenCalledWith(
          userId,
          newerSessions[0]!.deviceId,
        );
        expect(sessionRepository.delete).not.toHaveBeenCalledWith(
          userId,
          newerSessions[1]!.deviceId,
        );
      });

      it('should properly hash the refresh token', async () => {
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([]); // No existing session
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedSession,
        );

        await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        expect(hash).toHaveBeenCalledWith(refreshToken);
      });
    });

    describe('failure cases', () => {
      it('should throw SessionCreationFailedException when findAllByUserId throws an error', async () => {
        // Mock findAllByUserId to throw error
        vi.mocked(sessionRepository.findAllByUserId).mockRejectedValueOnce(
          new Error('Database error during findAll'),
        );

        // Attempt to create session
        await expect(
          sessionService.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
          ),
        ).rejects.toThrow(SessionCreationFailedException);

        // Verify error was logged
        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session find all',
          expect.any(Error),
          { userId: mockSessionData.userId },
        );

        // Verify no other operations were attempted
        expect(sessionRepository.create).not.toHaveBeenCalled();
        expect(hash).not.toHaveBeenCalled();
      });

      it('should throw SessionCreationFailedException when repository fails to create a new session', async () => {
        const repositoryError = new SessionRepositoryException(
          'create',
          userId,
          deviceId,
          new Error('Database connection failed'),
        );
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([]);
        vi.mocked(sessionRepository.create).mockRejectedValueOnce(
          repositoryError,
        );

        await expect(
          sessionService.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
          ),
        ).rejects.toThrow(SessionCreationFailedException);

        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session creation',
          repositoryError,
          {
            userId,
            deviceId,
          },
        );
      });

      it('should throw SessionCreationFailedException when repository fails to delete an existing session', async () => {
        const existingSession = createMockSession();
        const repositoryError = new SessionRepositoryException(
          'delete',
          userId,
          deviceId,
          new Error('Delete failed'),
        );
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([
          existingSession,
        ]);
        vi.mocked(sessionRepository.delete).mockRejectedValueOnce(
          repositoryError,
        );

        await expect(
          sessionService.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
          ),
        ).rejects.toThrow(SessionCreationFailedException);

        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session delete',
          repositoryError,
          {
            userId,
            deviceId,
          },
        );

        expect(sessionRepository.create).not.toHaveBeenCalled();
      });
      it('should throw SessionCreationFailedException when repository returns null from create', async () => {
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([]);
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(null);

        await expect(
          sessionService.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
          ),
        ).rejects.toThrow(SessionCreationFailedException);

        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session creation',
          expect.any(SessionRepositoryException),
          { userId, deviceId },
        );
      });

      it('should preserve original error details in SessionCreationFailedException', async () => {
        const originalError = new Error('Original error message');
        vi.mocked(sessionRepository.findAllByUserId).mockRejectedValueOnce(
          originalError,
        );

        try {
          await sessionService.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
          );
          fail('Should have thrown an error');
        } catch (error) {
          const sessionError = error as SessionCreationFailedException;
          expect(sessionError).toBeInstanceOf(SessionCreationFailedException);
          const repoError = sessionError.cause as SessionRepositoryException;
          expect(repoError).toBeInstanceOf(SessionRepositoryException);
          expect(repoError.cause).toBe(originalError);
        }
      });

      it('should complete session creation even if limit enforcement fails', async () => {
        const repositoryError = new SessionRepositoryException(
          'delete',
          userId,
          deviceId,
          new Error('Delete failed'),
        );
        const existingSessions = Array.from({ length: 5 }, (_, i) =>
          createMockSession({
            deviceId: `device${i + 1}`,
            lastUsedAt: new Date(`2024-12-${27 + i}`),
          }),
        );

        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce(
          existingSessions,
        );
        vi.mocked(sessionRepository.create).mockResolvedValueOnce(
          expectedSession,
        );
        vi.mocked(sessionRepository.delete).mockRejectedValueOnce(
          repositoryError,
        );

        const result = await sessionService.createSessionWithToken(
          userId,
          deviceId,
          refreshToken,
          expiresAt,
        );

        // Session should still be created
        expect(result).toEqual(expectedSession);

        // Error should be logged
        expect(loggerService.error).toHaveBeenCalledWith(
          'Error enforcing session limit',
          expect.any(Error),
          { userId },
        );
      });

      it('should handle error during token hashing', async () => {
        const hashingError = new Error('Argon2 hashing failed');
        vi.mocked(hash).mockRejectedValueOnce(hashingError);
        vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce([]);

        await expect(
          sessionService.createSessionWithToken(
            userId,
            deviceId,
            refreshToken,
            expiresAt,
          ),
        ).rejects.toThrow(SessionCreationFailedException);

        // Verify hashing was attempted
        expect(hash).toHaveBeenCalledWith(refreshToken);

        // Verify error logging
        expect(loggerService.error).toHaveBeenCalledWith(
          'Unexpected error during session creation',
          hashingError,
          {
            userId,
            deviceId,
          },
        );

        // Verify no session creation was attempted
        expect(sessionRepository.create).not.toHaveBeenCalled();
      });

      it('should handle invalid token format', async () => {
        // Mock hash to throw error for invalid tokens
        vi.mocked(hash).mockImplementation((token) => {
          if (!token || typeof token !== 'string' || token.length > 512) {
            throw new Error('Invalid token format');
          }
          return Promise.resolve(`hashed_${token}`);
        });

        const invalidTokens = [
          '', // empty string
          null, // null value
          undefined, // undefined
          12345, // number
          { token: 'invalid' }, // object
          'a'.repeat(513), // exceeds 512 character limit
        ];

        for (const invalidToken of invalidTokens) {
          vi.mocked(sessionRepository.findAllByUserId).mockResolvedValueOnce(
            [],
          ); // Reset for each iteration

          await expect(
            sessionService.createSessionWithToken(
              userId,
              deviceId,
              invalidToken as any, // Force invalid type
              expiresAt,
            ),
          ).rejects.toThrow(SessionCreationFailedException);

          // Verify error logging
          expect(loggerService.error).toHaveBeenCalledWith(
            'Unexpected error during session creation',
            expect.any(Error),
            {
              userId,
              deviceId,
            },
          );

          // Verify that create was never called with invalid token
          expect(sessionRepository.create).not.toHaveBeenCalled();
        }

        // Reset hash mock after test
        vi.mocked(hash).mockImplementation((token) =>
          Promise.resolve(`hashed_${token}`),
        );
      });
    });
  });

  describe('validateSession', () => {
    const { userId, deviceId, refreshToken, expiresAt, hashedRefreshToken } =
      mockSessionData;
    const expectedSession = createMockSession();

    it('should successfully validate a session with valid refresh token', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(
        expectedSession,
      );
      vi.mocked(sessionRepository.updateLastUsedAt).mockResolvedValueOnce(
        expectedSession,
      );

      const result = await sessionService.validateSession(
        userId,
        deviceId,
        refreshToken,
      );

      expect(result.userId).toEqual(userId);
      expect(result.deviceId).toEqual(deviceId);
      expect(result.token).toEqual(hashedRefreshToken);
      expect(result.expiresAt).toEqual(expiresAt);
      expect(result.lastUsedAt).toEqual(fakeNow);
      expect(result.createdAt).toEqual(fakeNow);

      expect(sessionRepository.findOne).toHaveBeenCalledWith(userId, deviceId);

      expect(verify).toHaveBeenCalledWith(hashedRefreshToken, refreshToken);

      expect(sessionRepository.updateLastUsedAt).toHaveBeenCalledWith(
        userId,
        deviceId,
      );
      expect(loggerService.debug).toHaveBeenCalledWith(
        'Validating session...',
        {
          userId,
          deviceId,
        },
      );
      expect(loggerService.info).toHaveBeenCalledWith(
        'Session validated successfully',
        {
          userId,
          deviceId,
        },
      );
    });

    it('should throw SessionNotFoundException when session does not exist', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);

      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).rejects.toThrow(SessionNotFoundException);

      expect(loggerService.error).toHaveBeenCalledWith('Session not found', {
        userId,
        deviceId,
      });

      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should throw SessionExpiredException when session is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce({
        ...expectedSession,
        expiresAt: expiredDate,
      });

      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).rejects.toThrow(SessionExpiredException);

      expect(loggerService.warn).toHaveBeenCalledWith('Session expired', {
        userId,
        deviceId,
      });

      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should throw InvalidRefreshTokenException when refresh token is invalid', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(
        expectedSession,
      );
      vi.mocked(verify).mockResolvedValueOnce(false);

      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).rejects.toThrow(InvalidRefreshTokenException);

      expect(loggerService.warn).toHaveBeenCalledWith('Invalid refresh token', {
        userId,
        deviceId,
      });

      expect(verify).toHaveBeenCalledWith(hashedRefreshToken, refreshToken);
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should update lastUsedAt timestamp when session is valid', async () => {
      const originalLastUsedAt = new Date('2025-01-01');
      const updatedLastUsedAt = new Date('2025-01-02');

      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce({
        ...expectedSession,
        lastUsedAt: originalLastUsedAt,
      });
      vi.mocked(sessionRepository.updateLastUsedAt).mockResolvedValueOnce({
        ...expectedSession,
        lastUsedAt: updatedLastUsedAt,
      });
      vi.mocked(verify).mockResolvedValueOnce(true);

      const result = await sessionService.validateSession(
        userId,
        deviceId,
        refreshToken,
      );

      expect(sessionRepository.updateLastUsedAt).toHaveBeenCalledWith(
        userId,
        deviceId,
      );

      expect(result.lastUsedAt).toEqual(updatedLastUsedAt);
      expect(result.lastUsedAt).not.toEqual(originalLastUsedAt);
    });

    it('should throw SessionValidationException when repository errors occur during find', async () => {
      const repositoryError = new SessionRepositoryException(
        'find',
        userId,
        deviceId,
        new Error('Database connection failed'),
      );
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(
        repositoryError,
      );

      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).rejects.toThrow(SessionValidationException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session find',
        repositoryError,
        {
          userId,
          deviceId,
        },
      );

      // Verify that subsequent operations were not called
      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should throw SessionValidationException when repository errors occur during lastUsedAt update', async () => {
      const repositoryError = new SessionRepositoryException(
        'update',
        userId,
        deviceId,
        new Error('Database update failed'),
      );

      // Mock successful session find and token verification
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(
        expectedSession,
      );
      vi.mocked(verify).mockResolvedValueOnce(true);

      // Mock failure during lastUsedAt update
      vi.mocked(sessionRepository.updateLastUsedAt).mockRejectedValueOnce(
        repositoryError,
      );

      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).rejects.toThrow(SessionValidationException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session update',
        repositoryError,
        {
          userId,
          deviceId,
        },
      );

      // Verify that the session was found and token was verified before error
      expect(sessionRepository.findOne).toHaveBeenCalledWith(userId, deviceId);
      expect(verify).toHaveBeenCalledWith(hashedRefreshToken, refreshToken);
    });

    it('should preserve repository error details in SessionValidationException', async () => {
      // Create a database error
      const databaseError = new Error('Database connection lost');

      // Mock the repository to throw the database error
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(databaseError);

      try {
        await sessionService.validateSession(userId, deviceId, refreshToken);
        fail('Should have thrown an error');
      } catch (error) {
        // Verify error chain with strong typing
        expect(error).toBeInstanceOf(SessionValidationException);
        const sessionError = error as SessionValidationException;

        // Access the cause (which should be the repository error)
        const cause = sessionError.cause;
        expect(cause).toBeInstanceOf(SessionRepositoryException);
        const repoError = cause as SessionRepositoryException;

        // Verify the original database error is preserved
        expect(repoError.cause).toBe(databaseError);

        // Verify the session validation message
        expect(sessionError.message).toBe('Failed to validate session');

        // Verify repository error message format
        expect(repoError.message).toBe(
          `Failed to find session for user ${userId} and device ${deviceId}`,
        );

        // Verify logging - the original database error is logged before being wrapped
        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session find',
          databaseError,
          {
            userId,
            deviceId,
          },
        );
      }
    });

    it('should throw SessionValidationException with correct message for unexpected errors', async () => {
      // Instead of TypeError, we should simulate a lower-level database error
      // that would actually come from the repository layer
      const databaseError = new Error('Database connection error');
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(databaseError);

      try {
        await sessionService.validateSession(userId, deviceId, refreshToken);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const sessionError = error as SessionValidationException;

        // Verify the error chain
        expect(sessionError.cause).toBeInstanceOf(SessionRepositoryException);
        const repoError = sessionError.cause as SessionRepositoryException;
        expect(repoError.cause).toBe(databaseError);

        // Verify error messages
        expect(sessionError.message).toBe('Failed to validate session');
        expect(repoError.message).toBe(
          `Failed to find session for user ${userId} and device ${deviceId}`,
        );

        // Verify logging
        expect(loggerService.error).toHaveBeenCalledWith(
          'Database error during session find',
          databaseError,
          {
            userId,
            deviceId,
          },
        );
      }

      // Verify that subsequent operations were not called
      expect(verify).not.toHaveBeenCalled();
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should handle null session return from repository correctly', async () => {
      // Mock findOne to return null
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);

      // Attempt to validate the session
      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).rejects.toThrow(SessionNotFoundException);

      // Verify error was logged
      expect(loggerService.error).toHaveBeenCalledWith('Session not found', {
        userId,
        deviceId,
      });

      // Verify that token verification was not attempted
      expect(verify).not.toHaveBeenCalled();

      // Verify that lastUsedAt was not updated
      expect(sessionRepository.updateLastUsedAt).not.toHaveBeenCalled();
    });

    it('should validate session dates properly across different timezones', async () => {
      // Create a session that expires at a specific UTC time
      const utcExpiryDate = new Date('2024-01-01T00:00:00Z'); // Z indicates UTC

      const sessionWithUTCDate = {
        ...expectedSession,
        expiresAt: utcExpiryDate,
      };

      // Mock findOne to return the session for both calls
      vi.mocked(sessionRepository.findOne)
        .mockResolvedValueOnce(sessionWithUTCDate) // First call (before expiry)
        .mockResolvedValueOnce(sessionWithUTCDate); // Second call (after expiry)

      vi.mocked(sessionRepository.updateLastUsedAt).mockResolvedValueOnce(
        sessionWithUTCDate,
      );

      // Mock current time to be just before expiry in UTC
      const justBeforeExpiry = new Date('2023-12-31T23:59:59Z');
      vi.setSystemTime(justBeforeExpiry);

      // Should validate successfully because we're before expiry
      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).resolves.toBeDefined();

      // Mock current time to be just after expiry in UTC
      const justAfterExpiry = new Date('2024-01-01T00:00:01Z');
      vi.setSystemTime(justAfterExpiry);

      // Should fail with expiry error regardless of local timezone
      await expect(
        sessionService.validateSession(userId, deviceId, refreshToken),
      ).rejects.toThrow(SessionExpiredException);

      // Reset system time
      vi.useRealTimers();
    });
  });

  describe('findAndVerifySession', () => {
    const { userId, deviceId } = mockSessionData;
    const validSession = createMockSession();
    const expiredSession = createMockSession({
      expiresAt: new Date('2024-01-01'),
    });

    it('should return valid session when exists and not expired', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(validSession);

      const result = await sessionService.findAndVerifySession(
        userId,
        deviceId,
      );

      expect(result).toEqual(validSession);
      expect(sessionRepository.findOne).toHaveBeenCalledWith(userId, deviceId);
    });

    it('should throw SessionNotFoundException when session does not exist', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(null);

      await expect(
        sessionService.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionNotFoundException);

      expect(loggerService.error).toHaveBeenCalledWith('Session not found', {
        userId,
        deviceId,
      });
    });

    it('should throw SessionExpiredException when session is expired', async () => {
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(
        expiredSession,
      );

      await expect(
        sessionService.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionExpiredException);
    });

    it('should throw SessionValidationException on repository error', async () => {
      const repoError = new SessionRepositoryException(
        'find',
        userId,
        deviceId,
        new Error('Database error'),
      );
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(repoError);

      await expect(
        sessionService.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionValidationException);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database error during session find',
        repoError,
        { userId, deviceId },
      );
    });

    it('should preserve error chain in SessionValidationException', async () => {
      const originalError = new Error('Connection timeout');
      vi.mocked(sessionRepository.findOne).mockRejectedValueOnce(originalError);

      try {
        await sessionService.findAndVerifySession(userId, deviceId);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionValidationException);
        const sessionError = error as SessionValidationException;
        const repoError = sessionError.cause as SessionRepositoryException;
        expect(repoError.cause).toBe(originalError);
      }
    });

    it('should handle timezone differences in expiration check', async () => {
      const utcExpiry = new Date('2024-01-01T00:00:00Z');
      const sessionWithUTC = createMockSession({ expiresAt: utcExpiry });

      // Test in local timezone just before expiry
      vi.setSystemTime(new Date('2023-12-31T23:59:59Z'));
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(
        sessionWithUTC,
      );
      await expect(
        sessionService.findAndVerifySession(userId, deviceId),
      ).resolves.toBeDefined();

      // Test in local timezone just after expiry
      vi.setSystemTime(new Date('2024-01-01T00:00:01Z'));
      vi.mocked(sessionRepository.findOne).mockResolvedValueOnce(
        sessionWithUTC,
      );
      await expect(
        sessionService.findAndVerifySession(userId, deviceId),
      ).rejects.toThrow(SessionExpiredException);
    });
  });
});
