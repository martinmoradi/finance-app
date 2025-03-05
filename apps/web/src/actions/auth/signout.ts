'use server';

import { getAuthHeaders } from '@/lib/api/auth/get-auth-headers';
import { getSession } from '@/lib/api/auth/get-session';
import { post } from '@/lib/api/request';
import { createErrorResponse } from '@/lib/utils/errors';
import { ApiResponse, ErrorCode } from '@repo/types';
import { cookies } from 'next/headers';

export async function signout(): Promise<ApiResponse<void>> {
  try {
    const session = await getSession();

    if (!session) {
      return createErrorResponse<void>(
        ErrorCode.UNKNOWN_ERROR,
        'No session found',
      );
    }

    const headers = await getAuthHeaders();

    const response = await post('/auth/signout', session, {
      headers: headers as Record<string, string>,
    });

    if (!response.success) {
      return createErrorResponse<void>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to signout',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    const cookieStore = await cookies();

    cookieStore.getAll().forEach((cookie) => {
      cookieStore.delete(cookie.name);
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Unexpected error in signoutAction:', error);
    return createErrorResponse<void>(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to signout',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
