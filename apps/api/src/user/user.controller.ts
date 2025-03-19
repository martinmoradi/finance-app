import { CsrfGuard } from '@/auth/guards/csrf.guard';
import { UserService } from '@/user/user.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DoubleCsrfUtilities } from 'csrf-csrf';
import { ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject('CSRF_PROVIDER')
    private readonly csrfProvider: DoubleCsrfUtilities,
  ) {}

  @ApiOperation({ summary: 'Check if a user exists by email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns true if user exists, false otherwise',
    type: Boolean,
  })
  @UseGuards(CsrfGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('exists')
  async checkUserExists(@Body('email') email: string): Promise<boolean> {
    const user = await this.userService.findByEmail(email);
    return !!user;
  }
}
