import { SessionValidationException } from '@/session/exceptions/session-validation.exception';

export class InvalidRefreshTokenException extends SessionValidationException {
  constructor() {
    super(new Error('Invalid refresh token provided'));
  }
}
