'use server';

import { sessionOptions } from '@/features/auth/config/session.config';
import { createErrorResponse } from '@/lib/errors';
import { post } from '@/lib/request';
import { ErrorCode, SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { withAuth } from './with-auth';

/**
 * Server action to handle user signout
 */
export const signout = withAuth<void>(async (headers, session) => {
  const requestId = headers['x-request-id'] || crypto.randomUUID();
  try {
    // 1. Make the API request
    const response = await post('/auth/signout', session.user, {
      headers: headers,
    });

    // 2. If request fails, return error
    if (!response.success) {
      return response; // (ApiError)
    }

    // 3. Delete cookies
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

    // 4. Return success
    return { success: true, data: undefined };
  } catch (error) {
    // If unexpected error, return error
    console.error('Unexpected error in signoutAction:', error);
    return createErrorResponse(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to signout',
      requestId,
      { originalError: error },
    );
  }
});
