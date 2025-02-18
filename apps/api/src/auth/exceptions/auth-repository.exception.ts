import { InternalServerErrorException } from '@nestjs/common';

export class AuthRepositoryException extends InternalServerErrorException {
  constructor(operation: string, userId: string, cause?: Error) {
    super(`Failed to ${operation} for user ${userId}`, { cause });
  }
}
