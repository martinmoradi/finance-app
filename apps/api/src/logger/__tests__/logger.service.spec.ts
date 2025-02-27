import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRequiredEnvVar } from '@repo/env-validation';
import { LoggerService } from '../logger.service';
import { RequestContextStorage } from '@/middleware/request-context.storage';

// Mock the request-context.storage
jest.mock('@/middleware/request-context.storage', () => ({
  RequestContextStorage: {
    getRequestId: jest.fn(),
  },
}));

// Mock the env-validation module
jest.mock('@repo/env-validation', () => ({
  getRequiredEnvVar: jest.fn(),
}));

// Mock @nestjs/common before using mockLoggerInstance
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

// Define the mock instance type
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

  describe('request ID enhancement', () => {
    const testMessage = 'Test message';
    const testContext = { user: 'testUser', action: 'test' };
    const testRequestId = 'test-request-id-123';

    beforeEach(() => {
      jest.clearAllMocks();
      service = new LoggerService();
    });

    it('should include request ID in context when available', () => {
      // Mock RequestContextStorage to return a request ID
      (RequestContextStorage.getRequestId as jest.Mock).mockReturnValue(
        testRequestId,
      );

      service.info(testMessage, testContext);

      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        ` ${testMessage}`,
        expect.objectContaining({
          requestId: testRequestId,
          user: 'testUser',
          action: 'test',
        }),
      );
    });

    it('should not modify context when request ID is not available', () => {
      // Mock RequestContextStorage to return undefined
      (RequestContextStorage.getRequestId as jest.Mock).mockReturnValue(
        undefined,
      );

      service.info(testMessage, testContext);

      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        ` ${testMessage}`,
        testContext,
      );
    });
  });

  describe('logging methods', () => {
    const testMessage = 'Test message';
    const testContext = { user: 'testUser', action: 'test' };

    beforeEach(() => {
      jest.clearAllMocks();
      service = new LoggerService();
      // Mock no request ID for these basic tests
      (RequestContextStorage.getRequestId as jest.Mock).mockReturnValue(
        undefined,
      );
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

  describe('sanitizeContext method', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should mask sensitive fields in production environment', () => {
      // Mock production environment
      (getRequiredEnvVar as jest.Mock).mockReturnValue('production');
      service = new LoggerService();

      const sensitiveContext = {
        username: 'testUser',
        password: 'secret123',
        authToken: 'xyz456',
        apiSecret: 'very-secret',
        userCredential: 'credential-value',
      };

      service.info('Test with sensitive data', sensitiveContext);

      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          username: 'testUser',
          password: '[REDACTED]',
          authToken: '[REDACTED]',
          apiSecret: '[REDACTED]',
          userCredential: '[REDACTED]',
        }),
      );
    });

    it('should not mask fields in development environment', () => {
      // Mock development environment
      (getRequiredEnvVar as jest.Mock).mockReturnValue('development');
      service = new LoggerService();

      const sensitiveContext = {
        username: 'testUser',
        password: 'secret123',
      };

      service.info('Test with sensitive data', sensitiveContext);

      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          username: 'testUser',
          password: 'secret123',
        }),
      );
    });
  });
});
