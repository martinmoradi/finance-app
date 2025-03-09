import type { SessionOptions } from 'iron-session';

export function getSessionOptions(ttl: number): SessionOptions {
  return {
    password: process.env.SESSION_SECRET!,
    cookieName: 'session',
    ttl,
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    },
  };
}

export const sessionOptions = getSessionOptions(60 * 14 + 30); // 14 minutes + 30 seconds
