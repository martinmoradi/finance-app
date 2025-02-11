import { AuthService } from '@/auth/auth.service';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload, PublicUser } from '@repo/types';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface RefreshTokenRequest extends Request {
  body: {
    refreshToken: string;
  };
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
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
