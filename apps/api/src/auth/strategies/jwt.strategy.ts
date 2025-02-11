import { AuthService } from '@/auth/auth.service';
import jwtConfig from '@/config/jwt.config';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT authentication strategy for Passport.
 * Validates JWT tokens against the database.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    const userId = payload.sub;
    const publicUser = await this.authService.validateJwtUser(userId);
    if (!publicUser) {
      throw new UnauthorizedException();
    }
    return publicUser;
  }
}
