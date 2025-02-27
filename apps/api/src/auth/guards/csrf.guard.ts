import { LoggerService } from '@/logger/logger.service';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DoubleCsrfUtilities } from 'csrf-csrf';
import { Request } from 'express';

interface CsrfRequest extends Request {
  cookies: {
    csrf?: string;
    '__Host-csrf'?: string;
  };
}

/**
 * Guard that protects routes from CSRF attacks by validating CSRF tokens.
 * Compares the token from the request header with the token stored in cookies.
 *
 * @implements {CanActivate}
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  /**
   * Creates an instance of CsrfGuard.
   * Initializes with utilities for CSRF token validation.
   *
   * @param csrfProvider - Utilities for handling CSRF token operations
   * @param logger - Logger service for logging
   */
  constructor(
    @Inject('CSRF_PROVIDER')
    private readonly csrfProvider: DoubleCsrfUtilities,
    private readonly logger: LoggerService,
  ) {
    this.logger = new LoggerService('CsrfGuard');
  }

  /**
   * Validates CSRF tokens before allowing route access.
   * Compares the token from x-csrf-token header with the __Host-csrf cookie.
   *
   * @param context - Execution context containing the request
   * @returns {boolean} True if CSRF validation passes
   * @throws {UnauthorizedException} If tokens are missing or don't match
   */
  canActivate(context: ExecutionContext): boolean {
    this.logger.debug('Validating CSRF tokens');
    try {
      // 1. Get the request
      const request = context.switchToHttp().getRequest<CsrfRequest>();

      // 2. Get the CSRF tokens
      const headerToken = request.headers['x-csrf-token'];
      const cookieKey =
        process.env.NODE_ENV === 'development' ? 'csrf' : '__Host-csrf';
      const cookieToken = request.cookies[cookieKey]?.split('|')[0];

      // 3. Validate the CSRF tokens
      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        this.logger.warn('CSRF validation failed', {
          hasHeaderToken: !!headerToken,
          hasCookieToken: !!cookieToken,
          cookieKey,
        });
        throw new UnauthorizedException('Invalid CSRF token');
      }

      // 4. Log the successful validation and return true
      this.logger.info('CSRF validation successful');
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error during CSRF validation', error);
      throw new UnauthorizedException('CSRF validation failed');
    }
  }
}
