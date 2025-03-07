'use server';

import { createErrorResponse } from '@/lib/errors';
import { get } from '@/lib/request';
import { ErrorCode, PublicUser } from '@repo/types';
import { withAuth } from './with-auth';

/**
 * Server action to get the current user's information
 */
export const getMe = withAuth<PublicUser>(async (headers) => {
  const requestId = headers['x-request-id'] || crypto.randomUUID();
  try {
    // 1. Make the API request
    const response = await get<PublicUser>('/auth/me', {
      headers: headers as Record<string, string>,
    });

    // 2. If request fails, return error
    if (!response.success) {
      return response; // (ApiError)
    }

    // 3. Return success
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Unexpected error in getMeAction:', error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during getMe',
      requestId,
      { originalError: error },
    );
  }
});
