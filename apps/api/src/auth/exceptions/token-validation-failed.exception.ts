import { UnauthorizedException } from '@nestjs/common';

export class TokenValidationFailedException extends UnauthorizedException {
  public readonly tokenType: 'access' | 'refresh';

  constructor(tokenType: 'access' | 'refresh', cause?: Error) {
    super(`Failed to validate ${tokenType} token`, { cause });
    this.tokenType = tokenType;
  }
}
