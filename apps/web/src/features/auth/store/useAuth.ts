import { signin } from '@/features/auth/actions/signin';
import { signout } from '@/features/auth/actions/signout';
import { signup } from '@/features/auth/actions/signup';
import { createErrorResponse } from '@/lib/errors';
import {
  ApiErrorDetails,
  ApiResponse,
  ErrorCode,
  PublicUser,
  Credentials,
} from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  user: PublicUser | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'error';
  error: ApiErrorDetails | null;
}

interface AuthActions {
  signup: (credentials: Credentials) => Promise<ApiResponse<PublicUser>>;
  signin: (credentials: Credentials) => Promise<ApiResponse<PublicUser>>;
  signout: () => Promise<ApiResponse<void>>;
  clearErrors: () => void;
}

export const useAuth = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      error: null,
      status: 'idle',

      clearErrors: () => set({ error: null, status: 'idle' }),

      signup: async (credentials: Credentials) => {
        set({ status: 'loading', error: null });
        try {
          const response = await signup(credentials);

          if (response.success) {
            set({
              user: response.data,
              isAuthenticated: true,
              error: null,
              status: 'idle',
            });
          } else {
            set({ error: response.error, status: 'error' });
          }
          return response;
        } catch (error) {
          const clientErrorId = crypto.randomUUID();

          Sentry.captureException(error, {
            level: 'error',
            tags: {
              error_type:
                error instanceof Error ? error.name : 'unexpected_signup_error',
            },
            extra: {
              client_error_id: clientErrorId,
              message: 'Unexpected error in auth store: signupAction',
            },
          });
          const errorResponse = createErrorResponse(
            ErrorCode.UNKNOWN_ERROR,
            'An unexpected client error occurred',
            clientErrorId,
            { originalError: error },
          );

          set({ status: 'error', error: errorResponse.error });
          return errorResponse;
        }
      },

      signin: async (credentials: Credentials) => {
        set({ status: 'loading', error: null });
        try {
          const response = await signin(credentials);

          if (response.success) {
            set({
              user: response.data,
              isAuthenticated: true,
              error: null,
              status: 'idle',
            });
            return response;
          } else {
            set({ error: response.error, status: 'error' });
            console.error(response.error.message);
            return response;
          }
        } catch (error) {
          const clientErrorId = crypto.randomUUID();

          Sentry.captureException(error, {
            level: 'error',
            tags: {
              error_type:
                error instanceof Error ? error.name : 'unexpected_signin_error',
            },
            extra: {
              client_error_id: clientErrorId,
              message: 'Unexpected error in auth store: signinAction',
            },
          });

          const errorResponse = createErrorResponse(
            ErrorCode.UNKNOWN_ERROR,
            'An unexpected client error occurred',
            clientErrorId,
            { originalError: error },
          );

          set({ status: 'error', error: errorResponse.error });
          return errorResponse;
        }
      },

      signout: async () => {
        set({ status: 'loading', error: null });
        try {
          await signout();
          set({
            user: null,
            isAuthenticated: false,
            status: 'idle',
            error: null,
          });
          return { success: true, data: undefined };
        } catch (error) {
          const clientErrorId = crypto.randomUUID();

          Sentry.captureException(error, {
            level: 'error',
            tags: {
              error_type:
                error instanceof Error
                  ? error.name
                  : 'unexpected_signout_error',
            },
            extra: {
              client_error_id: clientErrorId,
              message: 'Unexpected error in auth store: signoutAction',
            },
          });

          const errorResponse = createErrorResponse(
            ErrorCode.UNKNOWN_ERROR,
            'An unexpected client error occurred',
            clientErrorId,
            { originalError: error },
          );

          set({ status: 'error', error: errorResponse.error });
          return errorResponse;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
