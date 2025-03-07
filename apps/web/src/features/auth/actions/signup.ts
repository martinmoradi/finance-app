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

/**
 * Server action to handle user signup
 */
export async function signup(
  credentials: SignupCredentials,
): Promise<ApiResponse<PublicUser>> {
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
      console.error('Signup response error:', response);
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to signup',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    // 6. Handle auth tokens and cookies
    const setCookieHeader = response.headers?.get('Set-Cookie');
    await handleAuthTokens(setCookieHeader!, response.data);

    // 7. Return the user
    return { success: true, data: response.data };
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in signupAction:', error);
    return createErrorResponse<PublicUser>(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during signup',
      error instanceof Error ? error.message : undefined,
    );
  }
}
