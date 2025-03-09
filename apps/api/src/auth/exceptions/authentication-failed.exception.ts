import { UnauthorizedException } from '@nestjs/common';

export class AuthenticationFailedException extends UnauthorizedException {
  constructor(cause?: Error) {
    super('Authentication failed', { cause });
  }
}
