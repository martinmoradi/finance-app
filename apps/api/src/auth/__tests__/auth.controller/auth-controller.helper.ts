import { CookieService } from '@/cookie/cookie.service';
import { LoggerService } from '@/logger/logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PublicUser } from '@repo/types';
import { Request, Response } from 'express';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { CsrfGuard } from '@/auth/guards/csrf.guard';

interface CsrfProvider {
  generateToken: () => string;
}

export interface TestContext {
  controller: AuthController;
  mockAuthService: jest.Mocked<AuthService>;
  mockCookieService: jest.Mocked<CookieService>;
  mockCsrfProvider: jest.Mocked<CsrfProvider>;
  mockLoggerService: jest.Mocked<LoggerService>;
}

export const createMockRequest = (
  cookies: Record<string, string> = {},
): Request => {
  return {
    cookies,
    signedCookies: {},
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
  } as unknown as Request;
};

export const createMockRequestWithUser = (
  cookies: Record<string, string> = {},
  user: PublicUser,
): Request & { user: PublicUser } => {
  return {
    cookies,
    signedCookies: {},
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
    user,
  } as unknown as Request & { user: PublicUser };
};

export const createMockResponse = (): Response => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
};

export const setupTestModule = async (): Promise<TestContext> => {
  const mockAuthService = {
    signup: jest.fn(),
    signin: jest.fn(),
    signout: jest.fn(),
    renewAccessToken: jest.fn(),
    refreshTokens: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  const mockCookieService = {
    getOrCreateDeviceId: jest.fn(),
    clearAuthCookies: jest.fn(),
    generateDeviceId: jest.fn(),
    setAuthCookies: jest.fn(),
    isProd: false,
    isDev: true,
    setDeviceIdCookie: jest.fn(),
  } as unknown as jest.Mocked<CookieService>;

  const mockCsrfProvider: CsrfProvider = {
    generateToken: jest.fn().mockReturnValue('mock-csrf-token'),
  };

  const mockLoggerService = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    setContext: jest.fn(),
    forContext: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;

  const module: TestingModule = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }])],
    controllers: [AuthController],
    providers: [
      {
        provide: AuthService,
        useValue: mockAuthService,
      },
      {
        provide: CookieService,
        useValue: mockCookieService,
      },
      {
        provide: 'CSRF_PROVIDER',
        useValue: mockCsrfProvider,
      },
      {
        provide: LoggerService,
        useValue: mockLoggerService,
      },
      CsrfGuard,
    ],
  }).compile();

  const controller = module.get<AuthController>(AuthController);

  return {
    controller,
    mockAuthService,
    mockCookieService,
    mockCsrfProvider: mockCsrfProvider as jest.Mocked<CsrfProvider>,
    mockLoggerService,
  };
};
