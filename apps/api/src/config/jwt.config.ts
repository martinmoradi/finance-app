import { getRequiredEnvVar } from '@repo/env-validation';
import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

// Make secret required
type RequiredJwtModuleOptions = Required<Pick<JwtModuleOptions, 'secret'>> &
  Omit<JwtModuleOptions, 'secret'>;

/**
 * Configuration for JWT settings.
 * Provides the secret key and expiration time for JWT tokens
 */
export default registerAs('jwt', (): RequiredJwtModuleOptions => {
  const secret = getRequiredEnvVar('JWT_SECRET');
  const expiresIn = getRequiredEnvVar('JWT_EXPIRES_IN');

  return {
    secret,
    signOptions: { expiresIn },
  };
});
