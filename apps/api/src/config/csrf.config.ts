import { getRequiredEnvVar } from '@repo/env-validation';
import { doubleCsrf, DoubleCsrfUtilities } from 'csrf-csrf';

export const createCsrfProvider = (): DoubleCsrfUtilities => {
  const CSRF_SECRET = getRequiredEnvVar('CSRF_SECRET');
  const NODE_ENV = getRequiredEnvVar('NODE_ENV');
  const isDev = NODE_ENV === 'development';

  return doubleCsrf({
    getSecret: () => CSRF_SECRET,
    cookieName: isDev ? 'csrf' : '__Host-csrf',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: !isDev,
    },
    size: 64, // Size of the generated token
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });
};
