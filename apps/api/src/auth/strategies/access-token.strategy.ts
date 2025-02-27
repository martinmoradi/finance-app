import { AuthService } from '@/auth/auth.service';
import { InvalidDeviceIdException } from '@/auth/exceptions/invalid-deviceid.exception';
import { TokenValidationFailedException } from '@/auth/exceptions/token-validation-failed.exception';
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
 * Request type with cookie-based access token for validate method typing
 */
interface AccessTokenRequest extends Request {
  cookies: Pick<CookieContents, 'deviceId' | 'accessToken'>;
}

/**
 * JWT access token authentication strategy
 */
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  /**
   * Configures JWT validation with environment settings
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
   * Validates JWT payload and retrieves user data
   * @throws {UnauthorizedException} When authentication fails
   */
  async validate(
    request: AccessTokenRequest,
    payload: JwtPayload,
  ): Promise<PublicUser> {
    // 1. Get the user ID and device ID
    const userId = payload.sub;
    const deviceId = request.cookies['deviceId'];

    try {
      // 2. Validate the device ID
      this.authService.validateDeviceId(deviceId);

      // 3. Validate the access token and get the public user
      const publicUser = await this.authService.validateAccessToken(
        userId,
        deviceId,
      );

      // 4. Log the successful validation and return the public user
      this.logger.info('Access token validated', publicUser);
      return publicUser;
    } catch (error) {
      // Only log errors that are not handled by the auth service
      if (
        !(error instanceof InvalidDeviceIdException) &&
        !(error instanceof TokenValidationFailedException)
      ) {
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
