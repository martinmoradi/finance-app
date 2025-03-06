'use server';

import { createSessionCookie } from '@/features/auth/actions/create-session-cookie';
import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { post } from '@/lib/request';
import {
  parseCookiesFromHeader,
  ParsedCookie,
  setCookiesFromParsedData,
} from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import {
  ApiResponse,
  ErrorCode,
  PublicUser,
  SigninCredentials,
} from '@repo/types';
import { cookies } from 'next/headers';

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

    // 4. Parse cookies from response
    const cookieStore = await cookies();
    const setCookieHeader = response.headers?.get('Set-Cookie');
    const parsedCookies = parseCookiesFromHeader(setCookieHeader!);

    // 5. Filter cookies and get tokens
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

    // 6. Handle no access token or refresh token
    if (!accessToken || !refreshToken) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
      );
    }

    // 7. Set cookies
    setCookiesFromParsedData(cookieStore, filteredCookies);

    // 8. Handle no access token
    if (!accessToken || !refreshToken) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
      );
    }

    // 9. Create session cookie
    await createSessionCookie(response.data, accessToken, refreshToken);

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
