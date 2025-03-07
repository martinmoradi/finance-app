'use server';

import { createSessionCookie } from '@/features/auth/actions/create-session-cookie';
import {
  parseCookiesFromHeader,
  ParsedCookie,
  setCookiesFromParsedData,
} from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { ErrorCode, PublicUser } from '@repo/types';
import * as Sentry from '@sentry/nextjs';
import { cookies, headers } from 'next/headers';

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
      Sentry.captureMessage(
        'HandleAuthTokens: No access token or refresh token found',
        {
          level: 'error',
          tags: {
            request_id: requestId,
          },
          extra: {
            user,
          },
        },
      );
      return createErrorResponse(
        ErrorCode.UNKNOWN_ERROR,
        'No access token or refresh token found',
        requestId,
      );
    }

    // 4. Set cookies
    setCookiesFromParsedData(cookieStore, filteredCookies);

    // 5. Create session cookie
    await createSessionCookie(user, accessToken, refreshToken);
  } catch (error) {
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        error_type:
          error instanceof Error
            ? error.name
            : 'unexpected_handle_auth_tokens_error',
      },
      extra: {
        request_id: requestId,
        message: 'Unexpected error in handleAuthTokens',
      },
    });
    console.error('Error handling auth tokens:', error);
    return createErrorResponse(
      ErrorCode.UNKNOWN_ERROR,
      'Error handling auth tokens',
      requestId,
      { originalError: error },
    );
  }
}
