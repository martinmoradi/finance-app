import { AuthService } from '@/auth/auth.service';
import {
  InvalidDeviceIdException,
  TokenValidationFailedException,
} from '@/auth/exceptions';
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
    try {
      // 1. Validate device ID
      this.authService.validateDeviceId(deviceId);

      // 2. Validate refresh token
      if (!refreshToken) {
        this.logger.warn('Authentication failed: invalid refresh token', {
          userId,
          deviceId,
        });
        throw new InvalidRefreshTokenException();
      }

      // 3. Validate the refresh token
      const publicUser = await this.authService.validateRefreshToken(
        userId,
        refreshToken,
        deviceId,
      );

      return publicUser;
    } catch (error) {
      // Only log errors that are not handled by the auth service
      if (
        !(error instanceof TokenValidationFailedException) &&
        !(error instanceof InvalidRefreshTokenException) &&
        !(error instanceof InvalidDeviceIdException)
      ) {
        this.logger.error('Refresh token validation failed', {
          userId,
          deviceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      // Always return a generic UnauthorizedException to the client
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
