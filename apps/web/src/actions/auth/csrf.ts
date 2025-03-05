'use server';

import { post } from '@/lib/api/request';
import { parseAndSetCookies } from '@/lib/utils/cookies';
import { createErrorResponse } from '@/lib/utils/errors';
import { ApiResponse, CsrfTokenResponse, ErrorCode } from '@repo/types';
import { cookies } from 'next/headers';

export async function fetchCsrfToken(): Promise<
  ApiResponse<CsrfTokenResponse>
> {
  try {
    const response = await post<CsrfTokenResponse>('/auth/csrf-token', {});

    if (!response.success) {
      console.error('CSRF token response error:', response);
      return createErrorResponse<CsrfTokenResponse>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to fetch CSRF token',
      );
    }

    const cookieStore = await cookies();
    const setCookieHeader = response.headers?.get('Set-Cookie');
    parseAndSetCookies(cookieStore, setCookieHeader!);

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}
