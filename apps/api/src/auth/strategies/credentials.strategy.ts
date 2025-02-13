import { AuthService } from '@/auth/auth.service';
import { LoggerService } from '@/logger/logger.service';
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
  private readonly logger: LoggerService;
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
    this.logger = new LoggerService('CredentialsStrategy');
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
    this.logger.debug('Attempting credential validation', { email });
    try {
      const user = await this.authService.validateCredentials(email, password);
      if (!user) {
        this.logger.warn('Authentication failed: no user found', { email });
        throw new UnauthorizedException();
      }

      // Log success with minimal user info
      this.logger.info('Authentication successful', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      // Different log levels based on error type
      if (error instanceof UnauthorizedException) {
        this.logger.warn('Authentication failed: invalid credentials', {
          email,
          errorType: error.constructor.name,
        });
        throw error;
      }

      // Unexpected errors get logged as errors
      this.logger.error('Authentication failed: unexpected error', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
