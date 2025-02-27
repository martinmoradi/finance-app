import { registerAs } from '@nestjs/config';
import { JwtSignOptions } from '@nestjs/jwt';
import { getRequiredEnvVar } from '@repo/env-validation';

// Make secret and expiresIn required
type RequiredJwtSignOptions = Required<
  Pick<JwtSignOptions, 'secret' | 'expiresIn'>
> &
  Omit<JwtSignOptions, 'secret' | 'expiresIn'>;

export default registerAs('refreshJwt', (): RequiredJwtSignOptions => {
  const secret = getRequiredEnvVar('REFRESH_TOKEN_SECRET');
  const expiresIn = getRequiredEnvVar('REFRESH_TOKEN_EXPIRES_IN');

  return {
    secret,
    expiresIn,
  };
});
