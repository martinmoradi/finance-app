import { createSessionSchema } from '@repo/validation';
import { createZodDto } from 'nestjs-zod';

export class CreateSessionWithTokenDto extends createZodDto(
  createSessionSchema,
) {
  declare userId: string;

  declare deviceId: string;

  declare token: string;

  declare tokenId: string;

  declare expiresAt: Date;
}
