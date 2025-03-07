'use server';

import { parseAndSetCookies } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { ApiResponse, CsrfTokenResponse, ErrorCode } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { cookies, headers } from 'next/headers';
/**
 * Server action helper to fetch a new CSRF token
 */
export async function fetchCsrfToken(): Promise<
  ApiResponse<CsrfTokenResponse>
> {
  const requestId =
    (await headers()).get('x-request-id') || crypto.randomUUID();
  try {
    // 1. Make the API request
    const response = await post<CsrfTokenResponse>('/auth/csrf-token', {});

    // 2. Handle HTTP errors
    if (!response.success) {
      return response; // (ApiError)
    }

    // 3. Set cookies from response
    const cookieStore = await cookies();
    const setCookieHeader = response.headers?.get('Set-Cookie');
    parseAndSetCookies(cookieStore, setCookieHeader!);

    // 4. Return the response
    return { success: true, data: response.data };
  } catch (error) {
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        api_endpoint: '/auth/csrf-token',
        http_method: 'POST',
        error_type:
          error instanceof Error ? error.name : 'unexpected_fetch_csrf_error',
      },
      extra: {
        request_id: requestId,
        message: 'Unexpected error in fetchCsrfToken',
      },
    });
    console.error('Unexpected error in fetchCsrfToken:', error);
    return createErrorResponse(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to fetch CSRF token',
      requestId,
      { originalError: error },
    );
  }
}
