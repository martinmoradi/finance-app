import { AuthService } from '@/auth/auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserProfile } from '@repo/types';
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

  /**
   * Validates user credentials
   * @param email - User's email
   * @param password - User's password
   * @returns User object with minimal details
   * @throws UnauthorizedException if credentials are invalid
   */
  async validate(email: string, password: string): Promise<UserProfile> {
    const user = await this.authService.validateLocalUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
