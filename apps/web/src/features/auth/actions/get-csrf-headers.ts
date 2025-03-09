'use server';

import { fetchCsrfToken } from '@/features/auth/actions/fetch-csrf';
import { buildCookieHeader } from '@/features/auth/utils/cookies';
import { cookies, headers as nextHeaders } from 'next/headers';

/**
 * Gets the CSRF headers required for authenticated requests.
 * Fetches a new CSRF token if one doesn't exist.
 */
export async function getCsrfHeaders(): Promise<Record<string, string>> {
  const requestId =
    (await nextHeaders()).get('x-request-id') || crypto.randomUUID();
  // 1. Get cookie store and determine CSRF cookie name
  const cookieStore = await cookies();
  const csrfCookieName =
    process.env.NODE_ENV === 'development' ? 'csrf' : '__Host-csrf';
  const csrf = cookieStore.get(csrfCookieName);

  // 2. Fetch new CSRF token if none exists
  if (!csrf) {
    await fetchCsrfToken();
    // Get the freshly set token
    const freshCsrf = cookieStore.get(csrfCookieName);
    if (!freshCsrf) {
      return {};
    }
  }

  // 3. Get current CSRF token
  const currentCsrf = csrf || cookieStore.get(csrfCookieName);

  if (!currentCsrf?.value) {
    return {};
  }

  // 4. Build cookie headers with CSRF and device info
  const deviceId = cookieStore.get('deviceId');
  const headers: Record<string, string> = {
    'x-request-id': requestId,
  };

  const cookieData: Record<string, string> = {
    [csrfCookieName]: currentCsrf.value,
    ...(deviceId?.value && { deviceId: deviceId.value }),
  };

  headers['Cookie'] = buildCookieHeader(cookieData);

  // 5. Extract and set CSRF token header
  const decodedValue = decodeURIComponent(currentCsrf.value);
  const tokenPart = decodedValue.split('|')[0];
  headers['x-csrf-token'] = tokenPart || '';
  return headers;
}
