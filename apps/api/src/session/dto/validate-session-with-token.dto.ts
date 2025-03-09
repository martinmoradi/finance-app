import { validateSessionSchema } from '@repo/validation';
import { createZodDto } from 'nestjs-zod';

export class ValidateSessionWithTokenDto extends createZodDto(
  validateSessionSchema,
) {
  declare userId: string;

  declare deviceId: string;

  declare refreshToken: string;
}
