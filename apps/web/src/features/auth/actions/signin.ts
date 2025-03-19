'use server';

import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { handleAuthTokens } from '@/features/auth/actions/handle-auth-tokens';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { ApiResponse, ErrorCode, PublicUser, Credentials } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

/**
 * Server action to handle user signin
 */
export async function signin(
  credentials: Credentials,
): Promise<ApiResponse<PublicUser>> {
  const requestId =
    (await headers()).get('x-request-id') || crypto.randomUUID();

  try {
    // 1. Get CSRF headers
    const headers = await getCsrfHeaders();

    // 2. Make the API request
    const response = await post<PublicUser>('/auth/signin', credentials, {
      headers,
    });

    // 3. Handle HTTP errors
    if (!response.success) {
      return response; // (ApiError)
    }

    // 4. Handle auth tokens and cookies
    const setCookieHeader = response.headers?.get('Set-Cookie');
    await handleAuthTokens(setCookieHeader!, response.data);

    // 5. Return the user
    return { success: true, data: response.data };
  } catch (error) {
    // Handle unexpected errors
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        request_id: requestId,
        error_type:
          error instanceof Error ? error.name : 'unexpected_signin_error',
      },
      extra: {
        request_id: requestId,
        message: 'Unexpected error in signinAction',
      },
    });

    console.error('Unexpected error in signinAction:', error);

    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during signin',
      requestId,
      { originalError: error },
    );
  }
}
