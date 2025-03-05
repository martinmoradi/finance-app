'use server';

import { getAuthHeaders } from '@/lib/api/auth/get-auth-headers';
import { get } from '@/lib/api/request';
import { createErrorResponse } from '@/lib/utils/errors';
import { ApiResponse, ErrorCode, PublicUser } from '@repo/types';

export async function getMe(): Promise<ApiResponse<PublicUser>> {
  try {
    // 1. Get auth headers
    const headers = await getAuthHeaders();

    // 2. Make the API request
    const response = await get<PublicUser>('/auth/me', {
      headers: headers as Record<string, string>,
    });

    // 3. Handle HTTP errors
    if (!response.success) {
      console.error('Me response error:', response);
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to get me',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    // 4. Return the response
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
