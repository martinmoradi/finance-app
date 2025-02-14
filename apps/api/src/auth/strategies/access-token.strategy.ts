import { AuthService } from '@/auth/auth.service';
import jwtConfig from '@/config/jwt.config';
import { LoggerService } from '@/logger/logger.service';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface AccessTokenRequest extends Request {
  cookies: {
    deviceId: string;
  };
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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    this.logger.debug('Validating access token', payload);
    const userId = payload.sub;
    const deviceId = request.cookies['deviceId'];

    try {
      const publicUser = await this.authService.validateAccessToken(
        userId,
        deviceId,
      );
      if (!publicUser) {
        this.logger.warn('Invalid access token', { userId, deviceId });
        throw new UnauthorizedException('Invalid access token');
      }

      this.logger.info('Access token validated', publicUser);
      return publicUser;
    } catch (error) {
      this.logger.error('Access token validation failed', {
        userId,
        deviceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnauthorizedException('Access token validation failed');
    }
  }
}
