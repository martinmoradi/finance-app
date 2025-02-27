import { LoggerService } from '@/logger/logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { createDatabaseClient } from '@repo/database';
import { pg } from '@repo/database/';
import { getRequiredEnvVar } from '@repo/env-validation';
import { DatabaseService } from '../database.service';

// Mock external dependencies
jest.mock('@repo/database', () => ({
  createDatabaseClient: jest.fn(),
}));

jest.mock('@repo/env-validation', () => ({
  getRequiredEnvVar: jest.fn(),
}));

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockLoggerService: LoggerService;
  let mockPool: jest.Mocked<pg.Pool>;
  let mockDb: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a more complete mock pool implementation
    mockPool = {
      end: jest.fn().mockResolvedValue(undefined),
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
      expiredCount: 0,
      query: jest.fn(),
      connect: jest.fn(),
      release: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      options: {},
    } as unknown as jest.Mocked<pg.Pool>;

    // Create mock implementations
    mockDb = { query: jest.fn() };

    // Mock logger service
    mockLoggerService = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as unknown as LoggerService;

    // Mock database client creation
    jest.mocked(createDatabaseClient).mockResolvedValue({
      db: mockDb,
      pool: mockPool,
    });

    // Mock environment variable
    jest.mocked(getRequiredEnvVar).mockReturnValue('mock-database-url');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  describe('onModuleInit', () => {
    it('should initialize database connection with correct config', async () => {
      await service.onModuleInit();

      expect(getRequiredEnvVar).toHaveBeenCalledWith('DATABASE_URL');
      expect(createDatabaseClient).toHaveBeenCalledWith({
        connectionString: 'mock-database-url',
        maxConnections: 5,
        connectionTimeoutMillis: 10000,
      });
    });

    it('should handle database connection failure', async () => {
      const connectionError = new Error('Connection failed');
      jest.mocked(createDatabaseClient).mockRejectedValueOnce(connectionError);

      await expect(service.onModuleInit()).rejects.toThrow(connectionError);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close database connection pool', async () => {
      // Initialize the connection first
      await service.onModuleInit();

      // Then destroy it
      await service.onModuleDestroy();

      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    it('should handle gracefully when connection was never initialized', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('db getter', () => {
    it('should return database client when connection is initialized', async () => {
      // Initialize the connection
      await service.onModuleInit();

      // Access the protected db getter through a test method
      const dbGetter = (service as any).db;

      expect(dbGetter).toBe(mockDb);
    });

    it('should throw error and log fatal when accessing db before initialization', () => {
      expect(() => (service as any).db).toThrow(
        'Database connection not initialized',
      );
      expect(mockLoggerService.fatal).toHaveBeenCalledWith(
        'Database connection not initialized',
      );
    });
  });
});
