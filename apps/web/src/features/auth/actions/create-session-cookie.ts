'use server';

import { getSessionOptions } from '@/features/auth/config/session.config';
import { PublicUser } from '@repo/types';
import { getIronSession } from 'iron-session';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';
import { SessionData } from '@repo/types';

/**
 * Server action helper to create a session cookie
 */
export async function createSessionCookie(
  userData: PublicUser,
  jwt: string,
  refreshToken: string,
) {
  const cookieStore = await cookies();

  // 1. Decode JWT to get expiration time
  const jwtPayload = jwtDecode(jwt);
  const expiresAt = jwtPayload.exp! * 1000;

  // 2. Calculate TTL in seconds (JWT expiration - current time)
  const ttlInSeconds = Math.floor((expiresAt - Date.now()) / 1000);

  // 3. Get session options with the JWT-based TTL
  const options = getSessionOptions(ttlInSeconds - 30); // 30 seconds before expiration

  // 4. Create session with dynamic TTL
  const session = await getIronSession<SessionData>(cookieStore, options);

  // 5. Determine if expiration is soon (within 5 minutes)
  const expiresSoon = expiresAt - Date.now() < 5 * 60 * 1000;

  // 6. Update session with user data
  session.user = userData;
  session.isAuthenticated = true;
  session.expiresSoon = expiresSoon;
  session.refreshToken = refreshToken;
  // 7. Store the exact expiration timestamp for reference
  session.expiresAt = expiresAt;

  // 8. Save the session (this encrypts the data and sets the cookie)
  await session.save();

  return session;
}
