'use server';

import { getAuthHeaders } from '@/features/auth/actions/get-auth-headers';
import { getSession } from '@/features/auth/actions/get-session';
import { sessionOptions } from '@/features/auth/config/session.config';
import { post } from '@/lib/request';
import { createErrorResponse } from '@/lib/errors';
import { ApiResponse, ErrorCode, SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
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
    const ironSession = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions,
    );
    ironSession.user = null;
    ironSession.isAuthenticated = false;
    ironSession.refreshToken = '';

    ironSession.destroy();

    cookieStore.getAll().forEach((cookie) => {
      cookieStore.delete(cookie.name);
    });

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
