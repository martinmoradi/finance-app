'use server';

import { createSessionCookie } from '@/lib/api/auth/create-session-cookie';
import { getCsrfHeaders } from '@/lib/api/auth/get-csrf-headers';
import { post } from '@/lib/api/request';
import { parseAndSetCookies } from '@/lib/utils/cookies';
import { createErrorResponse } from '@/lib/utils/errors';
import {
  ApiResponse,
  ErrorCode,
  PublicUser,
  SigninCredentials,
} from '@repo/types';
import { cookies } from 'next/headers';

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

    // 4. Set cookies from response
    const cookieStore = await cookies();
    const setCookieHeader = response.headers?.get('Set-Cookie');
    const parsedCookies = parseAndSetCookies(cookieStore, setCookieHeader!);

    // 5. Get access token
    const accessToken = parsedCookies['accessToken'];

    // 6. Handle no access token
    if (!accessToken) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token found',
      );
    }

    // 7. Set session cookie
    createSessionCookie(response.data, accessToken);

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
