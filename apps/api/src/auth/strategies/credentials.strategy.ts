import { AuthService } from '@/auth/auth.service';
import { AuthenticationFailedException } from '@/auth/exceptions/authentication-failed.exception';
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
    try {
      // 1. Validate credentials
      const user = await this.authService.validateCredentials(email, password);

      // 2. Log success and return user
      this.logger.info('Authentication successful', {
        userId: user.id,
        email: user.email,
      });
      return user;
    } catch (error) {
      // Only log errors that are not handled by the auth service
      if (!(error instanceof AuthenticationFailedException)) {
        const unknownError = error as Error;
        this.logger.warn('Credential validation failed', {
          email,
          errorType: unknownError.constructor.name,
        });
      }

      // Always throw UnauthorizedException to the client
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
