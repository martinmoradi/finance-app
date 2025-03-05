'use server';

import { PublicUser } from '@repo/types';
import { cookies } from 'next/headers';

type SessionData = {
  data: PublicUser;
  expiresAt: number;
};

type Session =
  | {
      isAuthenticated: true;
      user: PublicUser;
      isExpired: boolean;
      expiresSoon: boolean;
    }
  | {
      isAuthenticated: false;
    };

/**
 * Server action helper to get the current user's session
 */
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return { isAuthenticated: false };
  }

  const sessionData = JSON.parse(session.value) as SessionData;
  const isExpired = Date.now() > sessionData.expiresAt;
  const expiresSoon = sessionData.expiresAt - Date.now() < 5 * 60 * 1000; // 5 minutes

  return {
    isAuthenticated: true,
    user: sessionData.data,
    isExpired,
    expiresSoon,
  };
}
