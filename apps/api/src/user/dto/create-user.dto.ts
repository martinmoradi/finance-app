import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { createUserSchema } from '@repo/validation';

export type CreateUserDto = z.infer<typeof createUserSchema>;

export class CreateUserDtoClass implements CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    minLength: 1,
    maxLength: 255,
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  name!: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123',
    minLength: 8,
    maxLength: 100,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$',
  })
  password!: string;
}
