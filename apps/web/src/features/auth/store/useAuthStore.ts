import { signin } from '@/features/auth/actions/signin';
import { signout } from '@/features/auth/actions/signout';
import { signup } from '@/features/auth/actions/signup';
import {
  ApiResponse,
  PublicUser,
  SigninCredentials,
  SignupCredentials,
} from '@repo/types';
import { create } from 'zustand';

interface Auth {
  // State
  user: PublicUser | null;
  isAuthenticated: boolean;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;

  // Actions
  signup: (credentials: SignupCredentials) => Promise<ApiResponse<PublicUser>>;
  signin: (credentials: SigninCredentials) => Promise<ApiResponse<PublicUser>>;
  signout: () => Promise<ApiResponse<void>>;
}

export const useAuth = create<Auth>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  error: null,

  signup: async (credentials: SignupCredentials) => {
    try {
      const response = await signup(credentials);
      if (response.success) {
        set({
          user: response.data,
          isAuthenticated: true,
          error: null,
        });
        return response;
      } else {
        set({ error: response.error });

        return response;
      }
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  signin: async (credentials: SigninCredentials) => {
    console.log('signin', credentials);
    try {
      const response = await signin(credentials);

      if (response.success) {
        set({
          user: response.data,
          isAuthenticated: true,
          error: null,
        });
        return response;
      } else {
        set({ error: response.error });
        console.error(response.error.message);
        return response;
      }
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  signout: async () => {
    try {
      await signout();
      set({ user: null, isAuthenticated: false });
      return { success: true, data: undefined };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
}));
