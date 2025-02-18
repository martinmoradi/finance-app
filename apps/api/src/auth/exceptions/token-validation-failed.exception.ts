import { UnauthorizedException } from '@nestjs/common';

export class TokenValidationFailedException extends UnauthorizedException {
  constructor(tokenType: 'access' | 'refresh', cause?: Error) {
    super(`Failed to validate ${tokenType} token`, { cause });
  }
}
