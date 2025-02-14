import { SessionValidationException } from '@/session/exceptions/session-validation.exception';

export class SessionNotFoundException extends SessionValidationException {
  constructor() {
    super('Session not found');
  }
}
