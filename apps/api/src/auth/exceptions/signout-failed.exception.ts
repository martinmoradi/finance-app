import { InternalServerErrorException } from '@nestjs/common';

export class SignoutFailedException extends InternalServerErrorException {
  constructor(cause?: Error) {
    super('Failed to complete signout process', { cause });
  }
}
