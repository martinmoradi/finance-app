import { UnauthorizedException } from '@nestjs/common';

export class InvalidDeviceIdException extends UnauthorizedException {
  constructor() {
    super('Invalid device ID format');
  }
}
