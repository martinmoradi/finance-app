'use server';

import { sessionOptions } from '@/features/auth/config/session.config';
import { SessionCookie, SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

/**
 * Server action helper to get the current user's session
 */
export async function getSession(): Promise<SessionCookie> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions,
  );

  // Check if session exists and is authenticated
  if (!session.isAuthenticated || !session.user) {
    return { isAuthenticated: false };
  }

  // Get current time
  const now = Date.now();

  // Check if we have an expiresAt value
  const expiresAt = session.expiresAt || 0;

  // Determine if expired or expiring soon
  const isExpired = expiresAt > 0 ? now > expiresAt : false;
  const expiresSoon =
    expiresAt > 0
      ? expiresAt - now < 5 * 60 * 1000 && expiresAt > now
      : session.expiresSoon || false;

  return {
    isAuthenticated: true,
    user: session.user,
    isExpired,
    expiresSoon,
    refreshToken: session.refreshToken,
  };
}
