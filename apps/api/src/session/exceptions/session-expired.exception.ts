import { SessionValidationException } from '@/session/exceptions/session-validation.exception';

export class SessionExpiredException extends SessionValidationException {
  constructor() {
    super(new Error('Session expired'));
  }
}
