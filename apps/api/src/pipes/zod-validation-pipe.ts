import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const parsedValue = this.schema.safeParse(value);
    if (!parsedValue.success) {
      const { error } = parsedValue;
      const message = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      throw new BadRequestException({
        message: 'Validation failed',
        errors: message,
      });
    }
    return parsedValue.data;
  }
}
