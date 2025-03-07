'use server';

import { getAuthHeaders } from '@/features/auth/actions/get-auth-headers';
import {
  getSessionOptions,
  sessionOptions,
} from '@/features/auth/config/session.config';
import { post } from '@/lib/request';
import { parseAndSetCookies } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { ApiResponse, ErrorCode, PublicUser, SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
import { jwtDecode } from 'jwt-decode';
import { cookies, headers } from 'next/headers';

/**
 * Server action to refresh user tokens
 */
export async function refreshTokens(): Promise<ApiResponse<PublicUser>> {
  const requestId =
    (await headers()).get('x-request-id') || crypto.randomUUID();
  try {
    // 1. Get session cookie
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions,
    );

    const user = session.user;

    // 2. Handle no session
    if (!session) {
      return createErrorResponse(
        ErrorCode.UNKNOWN_ERROR,
        'No session found',
        requestId,
      );
    }

    // 4. Get auth headers
    const headers = await getAuthHeaders({ isRefresh: true });
    console.log('headers', headers);
    const response = await post<PublicUser>('/auth/refresh', user, {
      headers: headers as Record<string, string>,
    });

    // 5. Handle HTTP errors
    if (!response.success) {
      return response; // (ApiError)
    }

    // 6. Set cookies from response
    const setCookieHeader = response.headers?.get('Set-Cookie');
    const parsedCookies = parseAndSetCookies(cookieStore, setCookieHeader!);

    // 7. Get tokens
    const accessToken = parsedCookies['accessToken'];
    const refreshToken = parsedCookies['refreshToken'];

    // 8. Handle no access token
    if (!accessToken) {
      return createErrorResponse(
        ErrorCode.UNKNOWN_ERROR,
        'No access token found',
        requestId,
      );
    }

    // 9. Handle no refresh token
    if (!refreshToken) {
      return createErrorResponse(
        ErrorCode.UNKNOWN_ERROR,
        'No refresh token found',
        requestId,
      );
    }

    // 10. Get JWT payload
    const jwtPayload = jwtDecode(accessToken);
    const expiresAt = jwtPayload.exp! * 1000;
    const ttlInSeconds = Math.floor((expiresAt - Date.now()) / 1000);

    // Update session configuration with new TTL
    session.updateConfig(getSessionOptions(ttlInSeconds));

    // Update session with refreshed data
    session.user = response.data;
    session.isAuthenticated = true;
    session.expiresSoon = expiresAt - Date.now() < 5 * 60 * 1000;
    session.expiresAt = expiresAt;
    session.refreshToken = refreshToken;
    // Save the session with the updated data
    await session.save();

    return { success: true, data: response.data };
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in refreshTokens:', error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'An unexpected error occurred during refreshTokens',
      requestId,
      { originalError: error },
    );
  }
}
