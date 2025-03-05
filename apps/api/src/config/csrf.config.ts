import { cookieConfig } from '@/config/cookie.config';
import { getRequiredEnvVar } from '@repo/env-validation';
import { doubleCsrf, DoubleCsrfUtilities } from 'csrf-csrf';

export const createCsrfProvider = (): DoubleCsrfUtilities => {
  const CSRF_SECRET = getRequiredEnvVar('CSRF_SECRET');
  const NODE_ENV = getRequiredEnvVar('NODE_ENV');
  const isDev = NODE_ENV === 'development';

  return doubleCsrf({
    getSecret: () => CSRF_SECRET,
    cookieName: isDev ? 'csrf' : '__Host-csrf',
    cookieOptions: cookieConfig,
    size: 64,
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });
};
