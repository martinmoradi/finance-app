import { SessionValidationException } from '@/session/exceptions/session-validation.exception';

export class SessionNotFoundException extends SessionValidationException {
  constructor() {
    super(new Error('Session not found'));
  }
}
