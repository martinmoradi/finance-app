import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

/**
 * Cookie data structure with name, value, and options
 */
export type ParsedCookie = {
  name: string;
  value: string;
  options: Partial<ResponseCookie>;
};

/**
 * Parse Set-Cookie header into structured cookie data
 * @param setCookieHeader - The Set-Cookie header value to parse
 * @returns Array of parsed cookies with name, value, and options
 */
export function parseCookiesFromHeader(
  setCookieHeader: string | null,
): ParsedCookie[] {
  if (!setCookieHeader) {
    return [];
  }

  // Parse and set cookies safely
  const cookieStrings = setCookieHeader.split(', ');
  const parsedCookies: ParsedCookie[] = [];

  for (const cookieStr of cookieStrings) {
    const cookieParts = cookieStr.split('; ');
    if (cookieParts.length === 0) continue;

    const nameValuePair = cookieParts[0];
    if (!nameValuePair) continue;

    const nameValueSplit = nameValuePair.split('=');
    if (nameValueSplit.length < 2) continue;

    const name = nameValueSplit[0];
    // Join with = in case the value itself contains = characters
    const value = nameValueSplit.slice(1).join('=');

    if (!name || !value) continue;

    // Build cookie options safely
    const cookieOptions: Partial<ResponseCookie> = {
      path: '/',
    };

    // Process cookie attributes
    for (let i = 1; i < cookieParts.length; i++) {
      const part = cookieParts[i];
      if (!part) continue;

      if (part === 'HttpOnly') {
        cookieOptions.httpOnly = true;
      } else if (part === 'Secure') {
        cookieOptions.secure = true;
      } else {
        const [attrName, attrValue] = part.split('=');
        if (!attrName) continue;

        switch (attrName) {
          case 'Path':
            cookieOptions.path = attrValue || '/';
            break;
          case 'SameSite':
            // Ensure sameSite is one of the allowed values
            if (attrValue === 'Lax') {
              cookieOptions.sameSite = 'lax';
            } else if (attrValue === 'Strict') {
              cookieOptions.sameSite = 'strict';
            } else if (attrValue === 'None') {
              cookieOptions.sameSite = 'none';
            }
            break;
          case 'Max-Age':
            if (attrValue) {
              const maxAge = parseInt(attrValue, 10);
              if (!isNaN(maxAge)) {
                cookieOptions.maxAge = maxAge;
              }
            }
            break;
          case 'Expires':
            if (attrValue) {
              try {
                const expiryDate = new Date(attrValue);
                if (!isNaN(expiryDate.getTime())) {
                  cookieOptions.expires = expiryDate;
                }
              } catch (e) {
                console.error('Failed to parse cookie expiry date', e);
              }
            }
            break;
        }
      }
    }

    parsedCookies.push({
      name,
      value,
      options: cookieOptions,
    });
  }

  return parsedCookies;
}

/**
 * Set cookies in the cookie store from parsed cookie data
 * @param cookieStore - The Next.js cookie store
 * @param parsedCookies - Array of parsed cookies from parseCookiesFromHeader
 * @returns Object mapping cookie names to their values
 */
export function setCookiesFromParsedData(
  cookieStore: ReadonlyRequestCookies,
  parsedCookies: ParsedCookie[],
): Record<string, string> {
  const cookieValues: Record<string, string> = {};

  for (const cookie of parsedCookies) {
    cookieStore.set(cookie.name, cookie.value, cookie.options);
    console.log(`Set cookie: ${cookie.name}`);
    cookieValues[cookie.name] = cookie.value;
  }

  return cookieValues;
}

/**
 * Parse and set cookies from a Set-Cookie header in one step
 * @param cookieStore - The Next.js cookie store
 * @param setCookieHeader - The Set-Cookie header value to parse
 * @returns Object mapping cookie names to their values
 */
export function parseAndSetCookies(
  cookieStore: ReadonlyRequestCookies,
  setCookieHeader: string | null,
): Record<string, string> {
  const parsedCookies = parseCookiesFromHeader(setCookieHeader);
  return setCookiesFromParsedData(cookieStore, parsedCookies);
}

/**
 * Build a cookie string for use in a Cookie header
 * @param cookies - Object mapping cookie names to values
 * @returns Cookie header string
 */
export function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}
