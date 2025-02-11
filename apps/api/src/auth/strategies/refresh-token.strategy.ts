import { AuthService } from '@/auth/auth.service';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Express Request type extension to ensure type safety for refresh token in request body.
 * Required for proper typing in the validate method.
 */
interface RefreshTokenRequest extends Request {
  body: {
    refreshToken: string;
  };
}

/**
 * Passport strategy for handling JWT refresh token authentication.
 * Used to issue new access tokens using a valid refresh token.
 *
 * The strategy extracts the refresh token from request body,
 * validates its signature and expiration, then verifies it
 * against stored user data.
 *
 * @implements {PassportStrategy}
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  /**
   * Creates an instance of RefreshTokenStrategy.
   * Configures JWT validation options and enables request pass-through.
   *
   * @param jwtRefreshConfiguration - Refresh token JWT configuration including secret
   * @param authService - Service handling authentication logic
   */
  constructor(
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfiguration: ConfigType<
      typeof refreshJwtConfig
    >,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: jwtRefreshConfiguration.secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  /**
   * Validates the refresh token and retrieves the associated user.
   * Called by Passport after token signature verification.
   *
   * @param req - Express request containing the raw refresh token
   * @param payload - Decoded JWT payload with user information
   * @returns Promise resolving to user data if token is valid
   * @throws {UnauthorizedException} If token is missing or invalid
   */
  async validate(
    req: RefreshTokenRequest,
    payload: JwtPayload,
  ): Promise<PublicUser> {
    const userId = payload.sub;
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const publicUser = await this.authService.validateRefreshToken(
      userId,
      refreshToken,
    );
    if (!publicUser) {
      throw new UnauthorizedException();
    }
    return publicUser;
  }
}
