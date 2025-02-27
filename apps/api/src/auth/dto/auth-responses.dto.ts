import { ApiProperty } from '@nestjs/swagger';
import { AuthTokens, PublicUser } from '@repo/types';

export class AuthUserResponse implements PublicUser {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  declare id: string;

  @ApiProperty({ example: 'user@example.com' })
  declare email: string;

  @ApiProperty({ example: 'John Doe' })
  declare name: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access token',
  })
  declare accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token',
  })
  declare refreshToken: string;

  constructor(user: PublicUser, tokens: AuthTokens) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    [this.accessToken, this.refreshToken] = tokens;
  }
}
