'use server';

import { ErrorCode } from '@repo/types';
import {
  ParsedCookie,
  setCookiesFromParsedData,
} from '@/features/auth/utils/cookies';
import { parseCookiesFromHeader } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { PublicUser } from '@repo/types';
import { cookies, headers } from 'next/headers';
import { createSessionCookie } from '@/features/auth/actions/create-session-cookie';

export async function handleAuthTokens(
  setCookieHeaders: string,
  user: PublicUser,
) {
  const requestId =
    (await headers()).get('x-request-id') || crypto.randomUUID();
  try {
    const cookieStore = await cookies();

    // 1. Parse cookies
    const parsedCookies = parseCookiesFromHeader(setCookieHeaders);

    // 2. Filter cookies and get tokens
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    const filteredCookies = parsedCookies.filter((cookie: ParsedCookie) => {
      if (cookie.name === 'refreshToken') {
        refreshToken = cookie.value;
        return false; // Remove from the array
      }
      if (cookie.name === 'accessToken') {
        accessToken = cookie.value;
        return true; // Keep in the array
      }
      return true; // Keep all other cookies
    });

    // 3. Handle no access token or refresh token
    if (!accessToken || !refreshToken) {
      return createErrorResponse(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
        requestId,
      );
    }

    // 4. Set cookies
    setCookiesFromParsedData(cookieStore, filteredCookies);

    // 5. Handle no tokens
    if (!accessToken || !refreshToken) {
      return createErrorResponse(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
        requestId,
      );
    }

    // 6. Create session cookie
    await createSessionCookie(user, accessToken, refreshToken);
  } catch (error) {
    console.error('Error handling auth tokens:', error);
    return createErrorResponse(
      ErrorCode.UNKNOWN_ERROR,
      'Error handling auth tokens',
      requestId,
      { originalError: error },
    );
  }
}
