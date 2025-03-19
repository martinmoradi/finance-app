// Import testing library
import '@testing-library/jest-dom';

// ============================================================================
// Global test configuration
// ============================================================================

// Fix timestamp for consistent testing
const mockNow = 1620000000000;
const realDateNow = Date.now.bind(global.Date);
global.Date.now = jest.fn(() => mockNow);

// Mock crypto for consistent UUIDs
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
  configurable: true,
});

// Prevent console logs during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
console.error = jest.fn();
console.log = jest.fn();

// ============================================================================
// Next.js mocks
// ============================================================================

// Mock Next.js headers and cookies
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

// Mock Next.js internationalization
jest.mock('next-intl', () => ({
  useTranslations: jest.fn().mockImplementation(() => (key: string) => key),
  useFormatter: jest.fn(),
}));

// Mock Next.js navigation components
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

// ============================================================================
// Authentication mocks
// ============================================================================

// Mock iron-session for auth state management
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

// Mock JWT decoder
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn().mockImplementation(() => ({
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
  })),
}));

// ============================================================================
// Utility mocks
// ============================================================================

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Sentry error tracking
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock error handling utilities
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

// Mock HTTP request utilities
jest.mock('@/lib/request', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

// ============================================================================
// Test lifecycle hooks
// ============================================================================

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  global.Date.now = realDateNow;
});

beforeEach(() => {
  jest.clearAllMocks();
});
