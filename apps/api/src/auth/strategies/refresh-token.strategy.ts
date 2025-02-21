import { AuthService } from '@/auth/auth.service';
import { AuthenticationFailedException } from '@/auth/exceptions';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import {
  CookieContents,
  CookieService,
  RequestWithCookies,
} from '@/cookie/cookie.service';
import { LoggerService } from '@/logger/logger.service';
import { InvalidRefreshTokenException } from '@/session/exceptions';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

/**
 * Express Request type extension to ensure type safety for cookie-based refresh token.
 * Required for proper typing in the validate method.
 */
interface RefreshTokenRequest extends Request {
  cookies: Pick<CookieContents, 'deviceId' | 'refreshToken'>;
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
   * @param cookieService - Service for extracting tokens from cookies
   */
  constructor(
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfiguration: ConfigType<
      typeof refreshJwtConfig
    >,
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {
    super({
      jwtFromRequest: (req: RequestWithCookies) =>
        this.cookieService.extractTokenFromCookie(req, 'refreshToken'),
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
   * @param req - Express request containing the refresh token in cookies
   * @param payload - Decoded JWT payload with user information
   * @returns Promise resolving to user data if token is valid
   * @throws {UnauthorizedException} If token is missing or invalid
   */
  async validate(
    req: RefreshTokenRequest,
    payload: JwtPayload,
  ): Promise<PublicUser> {
    const userId = payload.sub;
    const refreshToken = req.cookies['refreshToken'];
    const deviceId = req.cookies['deviceId'];

    this.logger.debug('Attempting refresh token validation', {
      userId,
      deviceId,
    });

    if (!refreshToken) {
      this.logger.warn('Authentication failed: missing refresh token', {
        userId,
      });
      throw new UnauthorizedException('Authentication failed');
    }

    if (!deviceId) {
      this.logger.warn('Authentication failed: missing device ID', {
        userId,
      });
      throw new UnauthorizedException('Authentication failed');
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
        throw new UnauthorizedException('Authentication failed');
      }

      this.logger.info('Refresh token validation successful', { publicUser });

      return publicUser;
    } catch (error) {
      if (error instanceof InvalidRefreshTokenException) {
        this.logger.warn('Authentication failed: invalid refresh token', {
          userId,
          deviceId,
          errorType: error.constructor.name,
          message: error.message,
        });
      } else if (error instanceof AuthenticationFailedException) {
        this.logger.warn(
          'Authentication failed: general authentication error',
          {
            userId,
            deviceId,
            errorType: error.constructor.name,
            message: error.message,
          },
        );
      } else {
        // Unexpected errors get logged as errors with full details
        this.logger.error('Authentication failed: unexpected error', {
          userId,
          deviceId,
          error:
            error instanceof Error
              ? {
                  name: error.constructor.name,
                  message: error.message,
                  stack: error.stack,
                }
              : 'Unknown error',
        });
      }

      // Always return a generic UnauthorizedException to the client
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
