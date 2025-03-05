import { CookieOptions } from 'express';

export const cookieConfig: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  // domain: '.local.dev',
  path: '/',
};
