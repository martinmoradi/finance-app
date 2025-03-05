'use server';

import { post } from '@/lib/api/request';
import { buildCookieHeader, parseAndSetCookies } from '@/lib/utils/cookies';
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
export async function signupAction(
  credentials: SignupCredentials,
): Promise<ApiResponse<PublicUser>> {
  try {
    // Validate with Zod
    const validationResult = createUserSchema.safeParse(credentials);

    // Handle validation errors
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
    const cookieStore = await cookies();
    const csrf = cookieStore.get('csrf');
    const deviceId = cookieStore.get('deviceId');
    const headers: Record<string, string> = {};

    if (csrf?.value && deviceId?.value) {
      // Manually create a cookie header with both required cookies
      headers['Cookie'] = buildCookieHeader({
        csrf: csrf.value,
        deviceId: deviceId.value,
      });
    }

    const response = await post<PublicUser>('/auth/signup', credentials, {
      headers,
    });

    if (!response.success) {
      console.error('Signup response error:', response);
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to signup',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    const setCookieHeader = response.headers?.get('Set-Cookie');
    parseAndSetCookies(cookieStore, setCookieHeader!);

    return { success: true, data: response.data };
  } catch (error) {
    // Handle unexpected errors
    return createErrorResponse<PublicUser>(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during signup',
      error instanceof Error ? error.message : undefined,
    );
  }
}
