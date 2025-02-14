import { UnauthorizedException } from '@nestjs/common';

export class SessionValidationException extends UnauthorizedException {
  constructor(message: string) {
    super(message);
  }
}
