'use server';

import { PublicUser } from '@repo/types';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';

/**
 * Server action helper to create a session cookie
 */
export async function createSessionCookie(data: PublicUser, jwt: string) {
  const cookieStore = await cookies();
  const jwtPayload = jwtDecode(jwt);
  const expiresAt = jwtPayload.exp! * 1000;

  cookieStore.set('session', JSON.stringify({ data, expiresAt }), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    expires: new Date(expiresAt),
  });
}
