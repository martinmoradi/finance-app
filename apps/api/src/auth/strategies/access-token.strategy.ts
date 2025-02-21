import { AuthService } from '@/auth/auth.service';
import { AuthenticationFailedException } from '@/auth/exceptions/authentication-failed.exception';
import jwtConfig from '@/config/jwt.config';
import {
  CookieContents,
  CookieService,
  RequestWithCookies,
} from '@/cookie/cookie.service';
import { LoggerService } from '@/logger/logger.service';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

/**
 * Express Request type extension to ensure type safety for cookie-based access token.
 * Required for proper typing in the validate method.
 */
interface AccessTokenRequest extends Request {
  cookies: Pick<CookieContents, 'deviceId' | 'accessToken'>;
}

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
    private readonly logger: LoggerService,
    private readonly cookieService: CookieService,
  ) {
    super({
      jwtFromRequest: (req: RequestWithCookies) =>
        this.cookieService.extractTokenFromCookie(req, 'accessToken'),
      secretOrKey: jwtConfiguration.secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
    this.logger = new LoggerService('AccessTokenStrategy');
  }

  /**
   * Validates the JWT payload and retrieves the associated user.
   * Called by Passport after token is verified.
   *
   * @param payload - Decoded JWT payload containing user information
   * @returns Promise resolving to user data if valid
   * @throws {UnauthorizedException} If user cannot be validated
   */
  async validate(
    request: AccessTokenRequest,
    payload: JwtPayload,
  ): Promise<PublicUser> {
    const userId = payload.sub;
    const deviceId = request.cookies['deviceId'];

    this.logger.debug('Validating access token', payload);

    if (!deviceId) {
      this.logger.warn('Missing deviceId cookie', { userId });
      throw new UnauthorizedException('Authentication failed');
    }

    try {
      const publicUser = await this.authService.validateAccessToken(
        userId,
        deviceId,
      );
      if (!publicUser) {
        this.logger.warn('Invalid access token', { userId, deviceId });
        throw new UnauthorizedException('Authentication failed');
      }

      this.logger.info('Access token validated', publicUser);
      return publicUser;
    } catch (error) {
      if (error instanceof AuthenticationFailedException) {
        this.logger.warn(
          'Access token validation failed: authentication error',
          {
            userId,
            deviceId,
            errorType: error.constructor.name,
            message: error.message,
          },
        );
      } else {
        this.logger.error('Access token validation failed', {
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
