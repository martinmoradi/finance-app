import { UnauthorizedException } from '@nestjs/common';

export class SessionValidationException extends UnauthorizedException {
  constructor(cause?: Error) {
    super('Failed to validate session', { cause });
  }
}
