import { AuthService } from '@/auth/auth.service';
import { AccessTokenAuthGuard } from '@/auth/guards/access-token-auth.guard';
import { CredentialsAuthGuard } from '@/auth/guards/credentials-auth.guard';
import { RefreshTokenAuthGuard } from '@/auth/guards/refresh-token-auth.guard';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthenticatedUser, PublicUser } from '@repo/types';
import { Request as ExpressRequest } from 'express';

@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto): Promise<AuthenticatedUser> {
    return this.authService.signup(createUserDto);
  }

  @UseGuards(CredentialsAuthGuard)
  @Post('signin')
  signin(
    @Request() req: ExpressRequest & { user: PublicUser },
  ): Promise<AuthenticatedUser> {
    return this.authService.signin(req.user);
  }

  @UseGuards(AccessTokenAuthGuard)
  @Post('signout')
  async signout(
    @Request() req: ExpressRequest & { user: PublicUser },
  ): Promise<void> {
    await this.authService.signout(req.user);
  }

  @UseGuards(RefreshTokenAuthGuard)
  @Post('refresh')
  refreshToken(
    @Request() req: ExpressRequest & { user: PublicUser },
  ): Promise<AuthenticatedUser> {
    return this.authService.renewAccessToken(req.user);
  }

  // Dummy route to test the JWT guard
  @UseGuards(AccessTokenAuthGuard)
  @Get('me')
  me(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
  ): AuthenticatedUser {
    return req.user;
  }
}
