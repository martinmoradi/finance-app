'use server';

import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { handleAuthTokens } from '@/features/auth/actions/handle-auth-tokens';
import { createErrorResponse, formatZodErrors } from '@/lib/errors';
import { post } from '@/lib/request';
import {
  ApiResponse,
  ErrorCode,
  PublicUser,
  SignupCredentials,
} from '@repo/types';
import { createUserSchema } from '@repo/validation';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

/**
 * Server action to handle user signup
 */
export async function signup(
  credentials: SignupCredentials,
): Promise<ApiResponse<PublicUser>> {
  const requestId =
    (await headers()).get('x-request-id') || crypto.randomUUID();
  try {
    // 1. Validate with Zod
    const validationResult = createUserSchema.safeParse(credentials);

    // 2. Handle validation errors
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          validationErrors: formatZodErrors(validationResult.error.errors),
        },
      };
    }

    // 3. Get CSRF headers
    const headers = await getCsrfHeaders();

    // 4. Make the API request
    const response = await post<PublicUser>('/auth/signup', credentials, {
      headers,
    });

    // 5. Handle HTTP errors
    if (!response.success) {
      return response; // (ApiError)
    }

    // 6. Handle auth tokens and cookies
    const setCookieHeader = response.headers?.get('Set-Cookie');
    await handleAuthTokens(setCookieHeader!, response.data);

    // 7. Return the user
    return { success: true, data: response.data };
  } catch (error) {
    // Handle unexpected errors
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        request_id: requestId,
        error_type:
          error instanceof Error ? error.name : 'unexpected_signup_error',
      },
      extra: {
        request_id: requestId,
        message: 'Unexpected error in signupAction',
      },
    });

    console.error('Unexpected error in signupAction:', error);

    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during signup',
      requestId,
      { originalError: error },
    );
  }
}
