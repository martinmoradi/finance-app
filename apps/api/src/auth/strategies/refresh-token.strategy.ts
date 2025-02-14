import { AuthService } from '@/auth/auth.service';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { LoggerService } from '@/logger/logger.service';

/**
 * Express Request type extension to ensure type safety for refresh token in request body.
 * Required for proper typing in the validate method.
 */
interface RefreshTokenRequest extends Request {
  body: {
    refreshToken: string;
  };
  cookies: {
    deviceId: string;
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
  private readonly logger: LoggerService;

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
    this.logger = new LoggerService('RefreshTokenStrategy');
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
    const { refreshToken } = req.body;
    const deviceId = req.cookies['deviceId'];

    this.logger.debug('Attempting refresh token validation', {
      userId,
      deviceId,
    });

    if (!refreshToken) {
      this.logger.warn('Authentication failed: missing refresh token', {
        userId,
      });
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const publicUser = await this.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      if (!publicUser) {
        this.logger.warn('Authentication failed: invalid refresh token', {
          userId,
          deviceId,
        });
        throw new UnauthorizedException();
      }

      // Log success with minimal user info
      this.logger.info('Refresh token validation successful', {
        userId: publicUser.id,
        deviceId,
      });

      return publicUser;
    } catch (error) {
      // Different log levels based on error type
      if (error instanceof UnauthorizedException) {
        this.logger.warn('Authentication failed: invalid refresh token', {
          userId,
          deviceId,
          errorType: error.constructor.name,
        });
        throw error;
      }

      // Unexpected errors get logged as errors
      this.logger.error('Authentication failed: unexpected error', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
