'use server';

import { buildCookieHeader } from '@/lib/utils/cookies';
import { createErrorResponse } from '@/lib/utils/errors';
import { ErrorCode } from '@repo/types';
import { cookies } from 'next/headers';

export async function getAuthHeaders() {
  // 1. Get cookies
  const cookieStore = await cookies();
  const csrfCookieName =
    process.env.NODE_ENV === 'development' ? 'csrf' : '__Host-csrf';
  const csrf = cookieStore.get(csrfCookieName);
  const deviceId = cookieStore.get('deviceId');
  const accessToken = cookieStore.get('accessToken');

  // 2. Handle missing cookies
  if (!accessToken?.value || !deviceId?.value || !csrf?.value) {
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
  };
  headers['Cookie'] = buildCookieHeader(cookieData);

  // 4. Build CSRF header
  const decodedValue = decodeURIComponent(csrf.value);
  const tokenPart = decodedValue.split('|')[0];
  headers['x-csrf-token'] = tokenPart || '';

  // 5. Return headers
  return headers;
}
