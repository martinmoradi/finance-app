import { InternalServerErrorException } from '@nestjs/common';

export class SignupFailedException extends InternalServerErrorException {
  constructor(cause?: Error) {
    super('Failed to complete signup process', { cause });
  }
}
