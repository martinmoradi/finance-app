'use server';

import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { handleAuthTokens } from '@/features/auth/actions/handle-auth-tokens';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import {
  ApiResponse,
  ErrorCode,
  PublicUser,
  SigninCredentials,
} from '@repo/types';

/**
 * Server action to handle user signin
 */
export async function signin(
  credentials: SigninCredentials,
): Promise<ApiResponse<PublicUser>> {
  try {
    // 1. Get CSRF headers
    const headers = await getCsrfHeaders();

    // 2. Make the API request
    const response = await post<PublicUser>('/auth/signin', credentials, {
      headers,
    });

    // 3. Handle HTTP errors
    if (!response.success) {
      console.error('Signin response error:', response);
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to signin',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    // 4. Handle auth tokens and cookies
    const setCookieHeader = response.headers?.get('Set-Cookie');
    await handleAuthTokens(setCookieHeader!, response.data);

    // 5. Return the user
    return { success: true, data: response.data };
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in signinAction:', error);
    return createErrorResponse<PublicUser>(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during signin',
      error instanceof Error ? error.message : undefined,
    );
  }
}
