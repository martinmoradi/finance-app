import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRequiredEnvVar } from '@repo/env-validation';
import { LoggerService } from '../logger.service';

// First, mock the env-validation module
jest.mock('@repo/env-validation', () => ({
  getRequiredEnvVar: jest.fn(),
}));

// Second, mock @nestjs/common before using mockLoggerInstance
jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
    forContext: jest.fn().mockReturnThis(),
    localInstance: { setContext: jest.fn() },
  };

  // Create a proper class constructor function
  function LoggerClass() {
    return mockLogger;
  }

  // Add the static method to the constructor function
  (LoggerClass as any).overrideLogger = jest.fn();

  return {
    ...originalModule,
    Logger: LoggerClass,
  };
});

// Third, define the mock instance type
const mockLoggerInstance = new (jest.requireMock('@nestjs/common').Logger)();

describe('LoggerService', () => {
  let service: LoggerService;
  let nestLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LoggerService,
          useFactory: () => new LoggerService(),
        },
        {
          provide: Logger,
          useValue: mockLoggerInstance,
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    nestLogger = module.get(Logger);

    // Clear mocks with proper typing
    (
      Object.keys(mockLoggerInstance) as (keyof typeof mockLoggerInstance)[]
    ).forEach((key) => {
      const fn = mockLoggerInstance[key];
      if (jest.isMockFunction(fn)) {
        fn.mockClear();
      }
    });
  });

  describe('constructor and context handling', () => {
    it('should create without service name', () => {
      const loggerService = new LoggerService();
      expect(loggerService['prefix']).toBe('');
    });

    it('should create with service name', () => {
      const loggerService = new LoggerService('TestService');
      expect(loggerService['prefix']).toBe('[TestService]:');
    });

    it('should set context', () => {
      service.setContext('NewContext');
      expect(service['prefix']).toBe('[NewContext]:');
    });

    it('should create new instance with different context', () => {
      const newLogger = service.forContext('NewContext');
      expect(newLogger).toBeInstanceOf(LoggerService);
      expect(newLogger['prefix']).toBe('[NewContext]:');
    });
  });

  describe('environment detection', () => {
    beforeEach(() => {
      (getRequiredEnvVar as jest.Mock).mockClear();
    });

    it('should detect development environment', () => {
      (getRequiredEnvVar as jest.Mock).mockReturnValue('development');
      // Re-initialize service after env mock
      service = new LoggerService();
      expect(service.isDev).toBe(true);
    });

    it('should detect production environment', () => {
      (getRequiredEnvVar as jest.Mock).mockReturnValue('production');
      expect(service.isDev).toBe(false);
    });
  });

  describe('logging methods', () => {
    const testMessage = 'Test message';
    const testContext = { user: 'testUser', action: 'test' };

    beforeEach(() => {
      jest.clearAllMocks();
      service = new LoggerService();
    });

    it('should log debug messages', () => {
      service.debug(testMessage, testContext);
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        expect.stringContaining(testMessage),
        testContext,
      );
    });

    it('should log info messages', () => {
      service.info(testMessage, testContext);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        ` ${testMessage}`,
        testContext,
      );
    });

    it('should log warning messages', () => {
      service.warn(testMessage, testContext);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        ` ${testMessage}`,
        testContext,
      );
    });

    it('should log error messages with Error object', () => {
      const error = new Error('Test error');
      service.error(testMessage, error, testContext);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.stringContaining(testMessage),
        expect.stringContaining('Error: Test error'),
        expect.objectContaining(testContext),
      );
    });
  });
});
