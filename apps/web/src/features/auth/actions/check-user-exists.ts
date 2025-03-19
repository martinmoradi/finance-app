'use server';

import { getCsrfHeaders } from '@/features/auth/actions/get-csrf-headers';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { ApiResponse, ErrorCode } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

export async function checkUserExists(
  email: string,
): Promise<ApiResponse<boolean>> {
  const requestId =
    (await headers()).get('x-request-id') || crypto.randomUUID();
  try {
    // 1. Get CSRF headers
    const headers = await getCsrfHeaders();

    // 2. Make the API request
    const response = await post<boolean>(
      '/user/exists',
      { email },
      {
        headers,
      },
    );

    // 3. Handle HTTP errors
    if (!response.success) {
      return response; // (ApiError)
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        request_id: requestId,
        error_type:
          error instanceof Error
            ? error.name
            : 'unexpected_check_user_exists_error',
      },
      extra: {
        request_id: requestId,
        message: 'Unexpected error in checkUserExistsAction',
      },
    });

    console.error('Unexpected error in checkUserExistsAction:', error);

    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during checkUserExists',
      requestId,
      { originalError: error },
    );
  }
}
