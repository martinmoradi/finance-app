Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('test-uuid-1234-abcd-5678-efghijklmnop'),
  configurable: true,
});

import { useAuth } from '@/features/auth/store/useAuth';
import { signin } from '@/features/auth/actions/signin';
import { signout } from '@/features/auth/actions/signout';
import { signup } from '@/features/auth/actions/signup';
import * as Sentry from '@sentry/nextjs';
import {
  ApiErrorDetails,
  ApiResponse,
  ErrorCode,
  PublicUser,
  Credentials,
} from '@repo/types';

jest.mock('@/features/auth/actions/signin', () => ({
  signin: jest.fn(),
}));

jest.mock('@/features/auth/actions/signout', () => ({
  signout: jest.fn(),
}));

jest.mock('@/features/auth/actions/signup', () => ({
  signup: jest.fn(),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

const mockedSignin = signin as jest.MockedFunction<typeof signin>;
const mockedSignout = signout as jest.MockedFunction<typeof signout>;
const mockedSignup = signup as jest.MockedFunction<typeof signup>;
const mockedSentry = Sentry.captureException as jest.MockedFunction<
  typeof Sentry.captureException
>;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useAuth', () => {
  const mockUser: PublicUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    useAuth.setState({
      user: null,
      isAuthenticated: false,
      error: null,
      status: 'idle',
    });

    localStorage.clear();
  });

  describe('initial state', () => {
    it('should initialize with the correct default values', () => {
      const state = useAuth.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.status).toBe('idle');
    });
  });

  describe('signup', () => {
    it('should update state on successful signup', async () => {
      const successResponse: ApiResponse<PublicUser> = {
        success: true,
        data: mockUser,
      };

      mockedSignup.mockResolvedValue(successResponse);

      const credentials: Credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await useAuth.getState().signup(credentials);

      const state = useAuth.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
      expect(state.status).toBe('idle');

      expect(mockedSignup).toHaveBeenCalledWith(credentials);
      expect(result).toEqual(successResponse);
    });

    it('should handle API errors during signup', async () => {
      const apiError: ApiResponse<PublicUser> = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid credentials',
          validationErrors: { email: ['Email already exists'] },
        },
      };

      mockedSignup.mockResolvedValue(apiError);

      const credentials: Credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await useAuth.getState().signup(credentials);

      const state = useAuth.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toEqual(apiError.error);
      expect(state.status).toBe('error');

      expect(result).toEqual(apiError);
    });

    it('should handle unexpected errors during signup', async () => {
      const error = new Error('Network error');
      mockedSignup.mockRejectedValue(error);

      const credentials: Credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await useAuth.getState().signup(credentials);

      const state = useAuth.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);

      expect(state.error).toBeDefined();
      expect(state.error?.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(state.error?.message).toBe('An unexpected client error occurred');
      expect(state.error?.details).toMatchObject({
        originalError: error,
      });

      expect(state.status).toBe('error');

      expect(mockedSentry).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: { error_type: 'Error' },
        }),
      );

      expect(mockedSentry).toHaveBeenCalled();
      if (mockedSentry.mock.calls.length > 0) {
        const sentryCallArgs = mockedSentry.mock.calls[0];
        const contextArg = sentryCallArgs![1] as {
          extra?: { client_error_id?: string; message?: string };
        };

        expect(contextArg?.extra?.message).toBe(
          'Unexpected error in auth store: signupAction',
        );
      }
    });
  });

  describe('signin', () => {
    it('should update state on successful signin', async () => {
      const successResponse: ApiResponse<PublicUser> = {
        success: true,
        data: mockUser,
      };

      mockedSignin.mockResolvedValue(successResponse);

      const credentials: Credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await useAuth.getState().signin(credentials);

      const state = useAuth.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
      expect(state.status).toBe('idle');

      expect(mockedSignin).toHaveBeenCalledWith(credentials);
      expect(result).toEqual(successResponse);
    });

    it('should handle API errors during signin', async () => {
      const apiError: ApiResponse<PublicUser> = {
        success: false,
        error: {
          code: ErrorCode.AUTHENTICATION_ERROR,
          message: 'Invalid credentials',
        },
      };

      mockedSignin.mockResolvedValue(apiError);

      const credentials: Credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await useAuth.getState().signin(credentials);

      const state = useAuth.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toEqual(apiError.error);
      expect(state.status).toBe('error');

      expect(result).toEqual(apiError);
    });

    it('should handle unexpected errors during signin', async () => {
      const error = new Error('Network error');
      mockedSignin.mockRejectedValue(error);

      const credentials: Credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      await useAuth.getState().signin(credentials);

      const state = useAuth.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.status).toBe('error');
      expect(state.error).toBeDefined();

      expect(mockedSentry).toHaveBeenCalledWith(error, expect.any(Object));
    });
  });

  describe('signout', () => {
    it('should clear user state on successful signout', async () => {
      useAuth.setState({
        user: mockUser,
        isAuthenticated: true,
        error: null,
        status: 'idle',
      });

      const signoutResponse: ApiResponse<void> = {
        success: true,
        data: undefined,
      };

      mockedSignout.mockResolvedValue(signoutResponse);

      const result = await useAuth.getState().signout();

      const state = useAuth.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.status).toBe('idle');

      expect(mockedSignout).toHaveBeenCalled();
      expect(result).toEqual(signoutResponse);
    });

    it('should handle unexpected errors during signout', async () => {
      useAuth.setState({
        user: mockUser,
        isAuthenticated: true,
        error: null,
        status: 'idle',
      });

      const error = new Error('Network error');
      mockedSignout.mockRejectedValue(error);

      await useAuth.getState().signout();

      const state = useAuth.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).not.toBeNull();
      expect(state.status).toBe('error');

      expect(mockedSentry).toHaveBeenCalledWith(error, expect.any(Object));
    });
  });

  describe('clearErrors', () => {
    it('should reset error state', () => {
      const errorDetails: ApiErrorDetails = {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Error message',
      };

      useAuth.setState({
        error: errorDetails,
        status: 'error',
      });

      useAuth.getState().clearErrors();

      const state = useAuth.getState();
      expect(state.error).toBeNull();
      expect(state.status).toBe('idle');
    });
  });

  describe('persistence', () => {
    it('should persist user and isAuthenticated to localStorage', () => {
      useAuth.setState({
        user: mockUser,
        isAuthenticated: true,
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'Some error' },
        status: 'error',
      });

      const storedData = localStorage.getItem('auth-storage');

      expect(storedData).toBeDefined();

      if (storedData) {
        const parsedData = JSON.parse(storedData);

        expect(parsedData.state).toBeDefined();
        expect(parsedData.state.user).toEqual(mockUser);
        expect(parsedData.state.isAuthenticated).toBe(true);
        expect(parsedData.state.error).toBeUndefined();
        expect(parsedData.state.status).toBeUndefined();
      }
    });
  });
});
