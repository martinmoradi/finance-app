import { ApiProperty } from '@nestjs/swagger';
import { createUserSchema } from '@repo/validation';
import { createZodDto } from 'nestjs-zod';

/**
 * Data transfer object for creating a new user.
 * Extends Zod schema validation for user creation.
 * Contains email, name and password fields with validation rules.
 */
export class CreateUserDto extends createZodDto(createUserSchema) {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    minLength: 1,
    maxLength: 255,
    format: 'email',
  })
  declare email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  declare name: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123',
    minLength: 8,
    maxLength: 100,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$',
  })
  declare password: string;
}
