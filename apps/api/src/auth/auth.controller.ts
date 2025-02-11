import { AuthService } from '@/auth/auth.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser, PublicUser } from '@repo/types';
import { Request as ExpressRequest } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto): Promise<AuthenticatedUser> {
    return this.authService.signup(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signin(
    @Request() req: ExpressRequest & { user: PublicUser },
  ): Promise<AuthenticatedUser> {
    return this.authService.signin(req.user);
  }

  // Dummy route to test the JWT guard
  @UseGuards(JwtAuthGuard) // This guard checks the JWT token
  @Get('me')
  me(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
  ): AuthenticatedUser {
    return req.user;
  }
}
