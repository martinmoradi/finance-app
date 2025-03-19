import '@testing-library/jest-dom';

const mockNow = 1620000000000; // Fixed timestamp
const realDateNow = Date.now.bind(global.Date);
global.Date.now = jest.fn(() => mockNow);

// Global mocks for all tests
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    get: jest.fn(),
  }),
  headers: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue('test-request-id'),
  }),
}));

Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

jest.mock('iron-session', () => ({
  getIronSession: jest.fn().mockResolvedValue({
    user: null,
    isAuthenticated: false,
    expiresSoon: false,
    refreshToken: '',
    expiresAt: 0,
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    updateConfig: jest.fn(),
  }),
  sealData: jest.fn(),
  unsealData: jest.fn(),
}));

// Mock jwt-decode which is also potentially problematic
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn().mockImplementation(() => ({
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
  })),
}));

jest.mock('next-intl', () => ({
  useTranslations: jest.fn().mockImplementation(() => (key: string) => key),
  useFormatter: jest.fn(),
}));

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
  }) => (
    <a href={href} data-testid='navigation-link'>
      {children}
    </a>
  ),
  usePathname: jest.fn(),
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest.fn((code, message, requestId, details) => ({
    success: false,
    error: {
      code,
      message,
      requestId,
      details,
    },
  })),
  // Other functions can be simple jest.fn() because they're not used in the useAuth tests
  mapHttpStatusToErrorCode: jest.fn(),
  formatZodErrors: jest.fn(),
  getUserFriendlyErrorMessage: jest.fn(),
  mapApiErrorsToFormErrors: jest.fn(),
}));

// Moc
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
console.error = jest.fn();
console.log = jest.fn();

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  global.Date.now = realDateNow;
});

beforeEach(() => {
  jest.clearAllMocks();
});
