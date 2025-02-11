import { AuthService } from '@/auth/auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { PublicUser } from '@repo/types';
import { Strategy } from 'passport-local';

/**
 * Passport strategy for validating user credentials (email/password).
 * Used during the login process to authenticate users against stored credentials.
 *
 * @implements {PassportStrategy}
 */
@Injectable()
export class CredentialsStrategy extends PassportStrategy(
  Strategy,
  'credentials',
) {
  /**
   * Creates an instance of CredentialsStrategy.
   * Configures the strategy to use email as the username field.
   *
   * @param authService - Service handling authentication logic
   */
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  /**
   * Validates user credentials against stored user data.
   * Called by Passport during login attempts.
   *
   * @param email - User's email address
   * @param password - User's password attempt
   * @returns Promise resolving to user data if credentials are valid
   * @throws {UnauthorizedException} If credentials are invalid
   */
  async validate(email: string, password: string): Promise<PublicUser> {
    const user = await this.authService.validateCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
