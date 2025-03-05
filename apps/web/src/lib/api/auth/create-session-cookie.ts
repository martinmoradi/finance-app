'use server';

import { PublicUser } from '@repo/types';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';

export async function createSessionCookie(data: PublicUser, jwt: string) {
  const cookieStore = await cookies();
  const jwtPayload = jwtDecode(jwt);
  const expiresAt = jwtPayload.exp! * 1000;
  console.log(new Date(expiresAt) > new Date());

  cookieStore.set('session', JSON.stringify({ data }), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    expires: new Date(expiresAt),
  });
}
