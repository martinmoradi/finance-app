import { selectSessionSchema } from '@repo/validation';
import { createZodDto } from 'nestjs-zod';

export class SelectSessionDto extends createZodDto(selectSessionSchema) {
  declare userId: string;

  declare deviceId: string;
}
