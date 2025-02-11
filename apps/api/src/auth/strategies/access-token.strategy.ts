import { AuthService } from '@/auth/auth.service';
import jwtConfig from '@/config/jwt.config';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Passport strategy for handling JWT access token authentication.
 * Validates incoming JWTs and extracts user information for protected routes.
 *
 * @implements {PassportStrategy}
 */
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  /**
   * Creates an instance of AccessTokenStrategy.
   * Configures JWT validation options using environment-specific settings.
   *
   * @param jwtConfiguration - JWT configuration including secret key
   * @param authService - Service handling authentication logic
   */
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConfiguration.secret,
      ignoreExpiration: false,
    });
  }

  /**
   * Validates the JWT payload and retrieves the associated user.
   * Called by Passport after token is verified.
   *
   * @param payload - Decoded JWT payload containing user information
   * @returns Promise resolving to user data if valid
   * @throws {UnauthorizedException} If user cannot be validated
   */
  async validate(payload: JwtPayload): Promise<PublicUser> {
    const userId = payload.sub;
    const publicUser = await this.authService.validateAccessToken(userId);
    if (!publicUser) {
      throw new UnauthorizedException();
    }
    return publicUser;
  }
}
