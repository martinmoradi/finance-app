import { AuthService } from '@/auth/auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { PublicUser } from '@repo/types';
import { Strategy } from 'passport-local';

/**
 * Local authentication strategy for Passport.
 * Validates user credentials against the database.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<PublicUser> {
    const user = await this.authService.validateLocalUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
