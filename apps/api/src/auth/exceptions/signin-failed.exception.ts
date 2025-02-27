import { InternalServerErrorException } from '@nestjs/common';

export class SigninFailedException extends InternalServerErrorException {
  constructor(cause?: Error) {
    super('Failed to complete signin process', { cause });
  }
}
