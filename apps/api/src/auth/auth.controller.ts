import { AuthService } from '@/auth/auth.service';
import { LocalAuthGuard } from '@/auth/guards/local-auth/local-auth.guard';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { User } from '@repo/types';
import { Request as ExpressRequest } from 'express';

/**
 * Controller handling authentication-related endpoints.
 * Provides endpoints for user registration and authentication.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles user registration/signup.
   * @param createUserDto - Data transfer object containing user registration details.
   * @returns Newly created user object.
   */
  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }

  /**
   * Handles user sign-in
   * @param req - Express request object containing user information
   * @returns Authenticated user object
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Request()
    req: ExpressRequest & { user: Pick<User, 'id' | 'email' | 'name'> },
  ) {
    return req.user;
  }
}
