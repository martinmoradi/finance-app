'use server';

import { getAuthHeaders } from '@/features/auth/actions/get-auth-headers';
import { getSession } from '@/features/auth/actions/get-session';
import { refreshTokens } from '@/features/auth/actions/refresh-tokens';
import { get } from '@/lib/request';
import { createErrorResponse } from '@/lib/errors';
import { ApiResponse, ErrorCode, PublicUser } from '@repo/types';

/**
 * Server action to get the current user's information
 */
export async function getMe(): Promise<ApiResponse<PublicUser>> {
  try {
    // 1. Get auth headers
    const headers = await getAuthHeaders();

    // 2. Get session
    const session = await getSession();

    // 3. If no session, return error
    if (!session.isAuthenticated) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No session found',
      );
    }

    // 4. Refresh tokens if expired
    if (session.isExpired) {
      await refreshTokens();
    }

    // 5. Make the API request
    const response = await get<PublicUser>('/auth/me', {
      headers: headers as Record<string, string>,
    });

    // 6. Handle HTTP errors
    if (!response.success) {
      console.error('Me response error:', response);
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to get me',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    // 7. Return the response
    return { success: true, data: response.data };
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in getMeAction:', error);
    return createErrorResponse<PublicUser>(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during getMe',
      error instanceof Error ? error.message : undefined,
    );
  }
}
