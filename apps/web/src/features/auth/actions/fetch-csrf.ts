'use server';

import { post } from '@/lib/request';
import { parseAndSetCookies } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { ApiResponse, CsrfTokenResponse, ErrorCode } from '@repo/types';
import { cookies } from 'next/headers';

/**
 * Server action helper to fetch a new CSRF token
 */
export async function fetchCsrfToken(): Promise<
  ApiResponse<CsrfTokenResponse>
> {
  try {
    // 1. Make the API request
    const response = await post<CsrfTokenResponse>('/auth/csrf-token', {});

    // 2. Handle HTTP errors
    if (!response.success) {
      console.error('CSRF token response error:', response);
      return createErrorResponse<CsrfTokenResponse>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to fetch CSRF token',
      );
    }

    // 3. Set cookies from response
    const cookieStore = await cookies();
    const setCookieHeader = response.headers?.get('Set-Cookie');
    parseAndSetCookies(cookieStore, setCookieHeader!);

    // 4. Return the response
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}
