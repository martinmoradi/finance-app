'use server';

import { ErrorCode } from '@repo/types';
import {
  ParsedCookie,
  setCookiesFromParsedData,
} from '@/features/auth/utils/cookies';
import { parseCookiesFromHeader } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { PublicUser } from '@repo/types';
import { cookies } from 'next/headers';
import { createSessionCookie } from '@/features/auth/actions/create-session-cookie';

export async function handleAuthTokens(
  setCookieHeaders: string,
  user: PublicUser,
) {
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
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
      );
    }

    // 4. Set cookies
    setCookiesFromParsedData(cookieStore, filteredCookies);

    // 5. Handle no tokens
    if (!accessToken || !refreshToken) {
      return createErrorResponse<PublicUser>(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
      );
    }

    // 6. Create session cookie
    await createSessionCookie(user, accessToken, refreshToken);
  } catch (error) {
    console.error('Error handling auth tokens:', error);
    return createErrorResponse<PublicUser>(
      ErrorCode.UNKNOWN_ERROR,
      'Error handling auth tokens',
    );
  }
}
