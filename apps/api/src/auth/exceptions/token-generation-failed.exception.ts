import { InternalServerErrorException } from '@nestjs/common';

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RENEWAL = 'renewal',
  GENERATION = 'generation',
}

/**
 * Exception thrown when token generation fails.
 */
export class TokenGenerationFailedException extends InternalServerErrorException {
  public readonly tokenType: TokenType;

  constructor(tokenType: TokenType, cause?: Error) {
    super(`Failed to generate ${tokenType} token`, { cause });
    this.tokenType = tokenType;
  }
}
