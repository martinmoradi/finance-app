'use server';

import { createSessionCookie } from '@/lib/api/auth/create-session-cookie';
import { getCsrfHeaders } from '@/lib/api/auth/get-csrf-headers';
import { post } from '@/lib/api/request';
import { parseAndSetCookies } from '@/lib/utils/cookies';
import { createErrorResponse, formatZodErrors } from '@/lib/utils/errors';
import {
  ApiResponse,
  ErrorCode,
  PublicUser,
  SignupCredentials,
} from '@repo/types';
import { createUserSchema } from '@repo/validation';
import { cookies } from 'next/headers';

/**
 * Server action to handle user signup
 *
 * @param signupFieldsData - User registration data validated against zod schema
 * @returns ApiResponse with status and relevant messages
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

    // 6. Set cookies from response
    const cookieStore = await cookies();
    const setCookieHeader = response.headers?.get('Set-Cookie');
    const parsedCookies = parseAndSetCookies(cookieStore, setCookieHeader!);

    // 5. Get access token
    const accessToken = parsedCookies['accessToken'];

    // 8. Handle no access token
    if (!accessToken) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token found',
      );
    }

    // 9. Set session cookie
    createSessionCookie(response.data, accessToken);

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
