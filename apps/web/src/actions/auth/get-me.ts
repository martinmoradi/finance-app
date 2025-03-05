'use server';

import { get } from '@/lib/api/request';
import { createErrorResponse } from '@/lib/utils/errors';
import { ErrorCode, PublicUser } from '@repo/types';
import { ApiResponse } from '@repo/types';
import { cookies } from 'next/headers';
import { buildCookieHeader } from '@/lib/utils/cookies';

export async function getMe(): Promise<ApiResponse<PublicUser>> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken');
    const deviceId = cookieStore.get('deviceId');

    // Create a Cookie header with all necessary cookies
    const headers: Record<string, string> = {};
    if (accessToken?.value && deviceId?.value) {
      // Manually create a cookie header with both required cookies
      headers['Cookie'] = buildCookieHeader({
        accessToken: accessToken.value,
        deviceId: deviceId.value,
      });
    }

    const response = await get<PublicUser>('/auth/me', {
      headers,
    });

    if (!response.success) {
      console.error('Me response error:', response);
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to get me',
        `HTTP error! status: ${response.error.code}`,
      );
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error in getMe:', error);
    return createErrorResponse<PublicUser>(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during getMe',
      error instanceof Error ? error.message : undefined,
    );
  }
}
