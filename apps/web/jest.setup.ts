import '@testing-library/jest-dom';

// Global mocks for all tests
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({
    getAll: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    get: jest.fn(),
  }),
}));

// Mock jwt-decode which is also potentially problematic
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn().mockImplementation(() => ({
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
  })),
}));

jest.mock('next-intl', () => ({
  useTranslations: jest.fn().mockImplementation((key: string) => key),
  useFormatter: jest.fn(),
}));
