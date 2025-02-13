import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUser } from '@repo/types';

export class AuthUserResponse implements AuthenticatedUser {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  declare id: string;

  @ApiProperty({ example: 'user@example.com' })
  declare email: string;

  @ApiProperty({ example: 'John Doe' })
  declare name: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  declare accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  declare refreshToken: string;
}
