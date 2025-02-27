import { LoggerService } from '@/logger/logger.service';
import { SessionRepository } from '@/session/session.repository';
import { SessionService } from '@/session/session.service';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseSession } from '@repo/types';
import { createMockSession, mockSessionData } from '../session.fixtures';
import { hash } from 'argon2';

export interface SessionTestContext {
  service: SessionService;
  repository: jest.Mocked<SessionRepository>;
  logger: jest.Mocked<LoggerService>;
  mockSession: DatabaseSession;
  hashedToken: string;
}

export const setupSessionTests = (): {
  getService: () => SessionService;
  getRepository: () => jest.Mocked<SessionRepository>;
  getLogger: () => jest.Mocked<LoggerService>;
  getMockSession: () => DatabaseSession;
  getHashedToken: () => string;
  createExpiredSession: (expiredDate?: Date) => DatabaseSession;
  createMultipleSessions: (count: number) => DatabaseSession[];
  mockSessionData: typeof mockSessionData;
} => {
  let moduleRef: TestingModule;
  let service: SessionService;
  let repository: jest.Mocked<SessionRepository>;
  let logger: jest.Mocked<LoggerService>;
  let mockSession: DatabaseSession;
  let hashedToken: string;

  beforeEach(async () => {
    // Set the date to 2025-01-01
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01'));

    // Create mock instances
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAllByUserId: jest.fn(),
      delete: jest.fn(),
      deleteAllForUser: jest.fn(),
      deleteExpired: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      forContext: jest.fn(),
      isDev: false,
    } as unknown as jest.Mocked<LoggerService>;

    // Create test module
    moduleRef = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: SessionRepository,
          useValue: repository,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    // Get service instance
    service = moduleRef.get<SessionService>(SessionService);

    // Create mock session and hash token
    mockSession = createMockSession();
    hashedToken = await hash(mockSessionData.token);

    // Default repository responses
    repository.findOne.mockResolvedValue(mockSession);
    repository.create.mockResolvedValue(mockSession);
    repository.update.mockResolvedValue(mockSession);
    repository.findAllByUserId.mockResolvedValue([mockSession]);
    repository.delete.mockResolvedValue(mockSession);
    repository.deleteAllForUser.mockResolvedValue([mockSession]);
  });

  afterEach(async () => {
    await moduleRef.close();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const createExpiredSession = (
    expiredDate = new Date('2020-01-01'),
  ): DatabaseSession => {
    return createMockSession({ expiresAt: expiredDate });
  };

  const createMultipleSessions = (count: number): DatabaseSession[] => {
    return Array.from({ length: count }, (_, i) =>
      createMockSession({
        deviceId: `device${i}`,
        lastUsedAt: new Date(Date.now() - i * 1000), // Each session used 1 second apart
      }),
    );
  };

  return {
    getService: (): SessionService => service,
    getRepository: (): jest.Mocked<SessionRepository> => repository,
    getLogger: (): jest.Mocked<LoggerService> => logger,
    getMockSession: (): DatabaseSession => mockSession,
    getHashedToken: (): string => hashedToken,
    createExpiredSession,
    createMultipleSessions,
    mockSessionData,
  };
};
