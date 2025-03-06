'use server';

import { createSessionCookie } from '@/features/auth/actions/create-session-cookie';
import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { post } from '@/lib/request';
import {
  parseCookiesFromHeader,
  ParsedCookie,
  setCookiesFromParsedData,
} from '@/features/auth/utils/cookies';
import { createErrorResponse, formatZodErrors } from '@/lib/errors';
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

    // 6. Parse cookies from response
    const cookieStore = await cookies();
    const setCookieHeader = response.headers?.get('Set-Cookie');
    const parsedCookies = parseCookiesFromHeader(setCookieHeader!);

    // 7. Filter cookies and get tokens
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    const filteredCookies = parsedCookies.filter((cookie: ParsedCookie) => {
      if (cookie.name === 'refreshToken') {
        refreshToken = cookie.value;
        return false; // Remove from the array
      }
      if (cookie.name === 'accessToken') {
        accessToken = cookie.value;
        return true; // Keep in the array
      }
      return true; // Keep all other cookies
    });

    // 8. Handle no access token or refresh token
    if (!accessToken || !refreshToken) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
      );
    }

    // 9. Set cookies
    setCookiesFromParsedData(cookieStore, filteredCookies);

    // 10. Handle no access token
    if (!accessToken || !refreshToken) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
      );
    }

    // 11. Create session cookie
    await createSessionCookie(response.data, accessToken, refreshToken);

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
