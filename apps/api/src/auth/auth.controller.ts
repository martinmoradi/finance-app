import { AuthService } from '@/auth/auth.service';
import { AuthUserResponse } from '@/auth/dto/auth-responses.dto';
import { AccessTokenAuthGuard } from '@/auth/guards/access-token-auth.guard';
import { CredentialsAuthGuard } from '@/auth/guards/credentials-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';
import { RefreshTokenAuthGuard } from '@/auth/guards/refresh-token-auth.guard';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthenticatedUser, PublicUser } from '@repo/types';
import { DoubleCsrfUtilities } from 'csrf-csrf';
import { Request as ExpressRequest, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('CSRF_PROVIDER')
    private readonly csrfProvider: DoubleCsrfUtilities,
  ) {}

  /* ---------------------- CSRF Token ---------------------- */
  @ApiOperation({ summary: 'Generate CSRF token' })
  @ApiResponse({
    status: 200,
    description: 'Returns a new CSRF token and sets it in cookies',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'csrf-token-example',
        },
      },
    },
  })
  @Post('csrf-token')
  generateCsrfToken(
    @Req() req: ExpressRequest,
    @Res() res: Response,
  ): Response {
    const token = this.csrfProvider.generateToken(req, res);
    return res.json({ token });
  }

  /* ---------------------- Register ---------------------- */
  @ApiOperation({ summary: 'Register new user' })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    type: AuthUserResponse,
  })
  @ApiConflictResponse({ description: 'User already exists' })
  @ApiUnauthorizedResponse({ description: 'Invalid CSRF token' })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - maximum 5 requests per minute allowed',
  })
  @ApiCookieAuth('deviceId')
  @ApiHeader({
    name: 'x-csrf-token',
    description: 'CSRF token required',
    required: true,
  })
  @UseGuards(CsrfGuard, ThrottlerGuard)
  @Post('signup')
  signup(
    @Body() createUserDto: CreateUserDto,
    @Req() req: ExpressRequest,
  ): Promise<AuthenticatedUser> {
    const deviceId: string = req.cookies['deviceId'];
    return this.authService.signup(createUserDto, deviceId);
  }

  /* ---------------------- Sign in ---------------------- */
  @ApiOperation({ summary: 'Sign in user' })
  @ApiOkResponse({
    description: 'User successfully authenticated',
    type: AuthUserResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or CSRF token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
        },
        password: {
          type: 'string',
          example: 'YourPassword123',
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - maximum 5 requests per minute allowed',
  })
  @ApiCookieAuth('deviceId')
  @ApiHeader({
    name: 'x-csrf-token',
    description: 'CSRF token required',
    required: true,
  })
  @UseGuards(CsrfGuard, CredentialsAuthGuard, ThrottlerGuard)
  @Post('signin')
  signin(
    @Request() req: ExpressRequest & { user: PublicUser },
  ): Promise<AuthenticatedUser> {
    const deviceId: string = req.cookies['deviceId'];
    return this.authService.signin(req.user, deviceId);
  }

  /* ---------------------- Sign out ---------------------- */
  @ApiOperation({ summary: 'Sign out user' })
  @ApiOkResponse({ description: 'User successfully signed out' })
  @ApiUnauthorizedResponse({ description: 'Invalid token or CSRF token' })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - maximum 5 requests per minute allowed',
  })
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('deviceId')
  @ApiHeader({
    name: 'x-csrf-token',
    description: 'CSRF token required',
    required: true,
  })
  @UseGuards(CsrfGuard, AccessTokenAuthGuard, ThrottlerGuard)
  @Post('signout')
  async signout(
    @Request() req: ExpressRequest & { user: PublicUser },
  ): Promise<void> {
    const deviceId: string = req.cookies['deviceId'];
    await this.authService.signout(req.user, deviceId);
  }

  /* ---------------------- Refresh access token ---------------------- */
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({
    description: 'New access token generated',
    type: AuthUserResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid refresh token or CSRF token',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - maximum 5 requests per minute allowed',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIs...',
        },
      },
    },
  })
  @ApiCookieAuth('deviceId')
  @ApiHeader({
    name: 'x-csrf-token',
    description: 'CSRF token required',
    required: true,
  })
  @UseGuards(CsrfGuard, RefreshTokenAuthGuard, ThrottlerGuard)
  @Post('refresh')
  refreshToken(
    @Request() req: ExpressRequest & { user: PublicUser },
  ): Promise<AuthenticatedUser> {
    return this.authService.renewAccessToken(req.user);
  }

  /* ---------------------- Get authenticated user ---------------------- */
  @UseGuards(AccessTokenAuthGuard)
  @Get('me')
  me(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
  ): AuthenticatedUser {
    return req.user;
  }
}
