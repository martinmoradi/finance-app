'use server';

import { getSession } from '@/features/auth/actions/get-session';
import { buildCookieHeader } from '@/features/auth/utils/cookies';
import { createErrorResponse } from '@/lib/errors';
import { ErrorCode } from '@repo/types';
import { cookies } from 'next/headers';

interface GetAuthHeadersOptions {
  isRefresh?: boolean;
}

/**
 * Server action helper to get the authentication headers
 */
export async function getAuthHeaders({
  isRefresh = false,
}: GetAuthHeadersOptions = {}) {
  // 1. Get cookies
  const cookieStore = await cookies();
  const csrfCookieName =
    process.env.NODE_ENV === 'development' ? 'csrf' : '__Host-csrf';
  const csrf = cookieStore.get(csrfCookieName);
  const deviceId = cookieStore.get('deviceId');
  const accessToken = cookieStore.get('accessToken');

  const session = await getSession();

  // 2. Handle missing cookies
  if (
    !accessToken?.value ||
    !deviceId?.value ||
    !csrf?.value ||
    !session.isAuthenticated
  ) {
    return createErrorResponse(
      ErrorCode.AUTHENTICATION_ERROR,
      'Unauthenticated',
    );
  }

  // 3. Build headers
  const headers: Record<string, string> = {};
  const cookieData: Record<string, string> = {
    [csrfCookieName]: csrf.value,
    deviceId: deviceId.value,
    accessToken: accessToken.value,
    ...(isRefresh ? { refreshToken: session.refreshToken } : {}),
  };
  headers['Cookie'] = buildCookieHeader(cookieData);

  // 4. Build CSRF header
  const decodedValue = decodeURIComponent(csrf.value);
  const tokenPart = decodedValue.split('|')[0];
  headers['x-csrf-token'] = tokenPart || '';

  // 5. Return headers
  return headers;
}
