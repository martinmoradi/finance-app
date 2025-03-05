'use server';

import { createSessionCookie } from '@/lib/api/auth/create-session-cookie';
import { getAuthHeaders } from '@/lib/api/auth/get-auth-headers';
import { post } from '@/lib/api/request';
import { parseAndSetCookies } from '@/lib/utils/cookies';
import { createErrorResponse } from '@/lib/utils/errors';
import { ApiResponse, ErrorCode, PublicUser } from '@repo/types';
import { cookies } from 'next/headers';

/**
 * Server action to refresh user tokens
 */
export async function refreshTokens(): Promise<ApiResponse<PublicUser>> {
  try {
    // 1. Get session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    // 2. Handle no session
    if (!session) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No session found',
      );
    }

    // 3. Parse session cookie
    const { user } = JSON.parse(session.value) as { user: PublicUser };

    // 4. Get auth headers
    const headers = await getAuthHeaders();
    const response = await post<PublicUser>('/auth/refresh', user, {
      headers: headers as Record<string, string>,
    });

    // 5. Handle HTTP errors
    if (!response.success) {
      console.error('Refresh response error', response);
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to refresh tokens',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    // 6. Set cookies from response
    const setCookieHeader = response.headers?.get('Set-Cookie');
    const parsedCookies = parseAndSetCookies(cookieStore, setCookieHeader!);

    // 7. Get access token
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
    console.error('Unexpected error in refreshTokens:', error);
    return createErrorResponse<PublicUser>(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during refreshTokens',
      error instanceof Error ? error.message : undefined,
    );
  }
}
