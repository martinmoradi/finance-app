'use server';

import { getAuthHeaders } from '@/lib/api/auth/get-auth-headers';
import { getSession } from '@/lib/api/auth/get-session';
import { post } from '@/lib/api/request';
import { createErrorResponse } from '@/lib/utils/errors';
import { ApiResponse, ErrorCode } from '@repo/types';
import { cookies } from 'next/headers';

/**
 * Server action to handle user signout
 */
export async function signout(): Promise<ApiResponse<void>> {
  try {
    // 1. Get server side session
    const session = await getSession();

    // 2. If no session, return error
    if (!session.isAuthenticated) {
      return createErrorResponse<void>(
        ErrorCode.UNKNOWN_ERROR,
        'No session found',
      );
    }

    // 3. Get auth headers
    const headers = await getAuthHeaders();

    // 4. Make the API request
    const response = await post('/auth/signout', session.user, {
      headers: headers as Record<string, string>,
    });

    // 5. If request fails, return error
    if (!response.success) {
      return createErrorResponse<void>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to signout',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    // 6. Delete cookies
    const cookieStore = await cookies();

    cookieStore.getAll().forEach((cookie) => {
      cookieStore.delete(cookie.name);
    });

    // 7. Return success
    return { success: true, data: undefined };
  } catch (error) {
    // If unexpected error, return error
    console.error('Unexpected error in signoutAction:', error);
    return createErrorResponse<void>(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to signout',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
