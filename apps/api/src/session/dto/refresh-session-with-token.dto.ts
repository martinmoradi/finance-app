import { refreshSessionSchema } from '@repo/validation';
import { createZodDto } from 'nestjs-zod';

export class RefreshSessionWithTokenDto extends createZodDto(
  refreshSessionSchema,
) {
  declare userId: string;

  declare deviceId: string;

  declare token: string;

  declare tokenId: string;
}
