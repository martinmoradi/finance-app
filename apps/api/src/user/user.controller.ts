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

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject('CSRF_PROVIDER')
    private readonly csrfProvider: DoubleCsrfUtilities,
  ) {}

  @UseGuards(CsrfGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('exists')
  async checkUserExists(@Body('email') email: string): Promise<boolean> {
    const user = await this.userService.findByEmail(email);
    return !!user;
  }
}
