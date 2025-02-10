import { getRequiredEnvVar } from '@repo/env-validation';
import { registerAs } from '@nestjs/config';

/**
 * Configuration for JWT settings.
 * Provides the secret key and expiration time for JWT tokens
 */
export default registerAs('jwt', () => {
  const secret = getRequiredEnvVar('JWT_SECRET');
  const expiresIn = getRequiredEnvVar('JWT_EXPIRES_IN');

  return {
    secret,
    signOptions: { expiresIn },
  };
});
