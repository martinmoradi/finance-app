import { AuthService } from '@/auth/auth.service';
import { AuthUserResponse } from '@/auth/dto/auth-responses.dto';
import { AccessTokenAuthGuard } from '@/auth/guards/access-token-auth.guard';
import { CredentialsAuthGuard } from '@/auth/guards/credentials-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';
import { RefreshTokenAuthGuard } from '@/auth/guards/refresh-token-auth.guard';
import { CookieService } from '@/cookie/cookie.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  BadRequestException,
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
    private readonly cookieService: CookieService,
    @Inject('CSRF_PROVIDER')
    private readonly csrfProvider: DoubleCsrfUtilities,
  ) {}

  /* ---------------------- CSRF Token ---------------------- */
  @ApiOperation({ summary: 'Generate CSRF token' })
  @ApiResponse({
    status: 201,
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
    const deviceId = this.cookieService.getOrCreateDeviceId(req, res);
    return res.json({
      token,
      deviceId,
    });
  }

  /* ---------------------- Register ---------------------- */
  @ApiOperation({ summary: 'Register new user' })
  @ApiCreatedResponse({
    description:
      'User successfully registered. Access and refresh tokens are set in HTTP-only cookies.',
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
  async signup(
    @Body() createUserDto: CreateUserDto,
    @Req() req: ExpressRequest,
    @Res() res: Response,
  ): Promise<Response> {
    const deviceId: string = req.cookies['deviceId'];
    if (!deviceId) {
      throw new BadRequestException('Device ID is required');
    }
    const [user, tokens] = await this.authService.signup(
      createUserDto,
      deviceId,
    );
    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return res.json(user);
  }

  /* ---------------------- Sign in ---------------------- */
  @ApiOperation({ summary: 'Sign in user' })
  @ApiOkResponse({
    description:
      'User successfully authenticated. Access and refresh tokens are set in HTTP-only cookies.',
    type: AuthUserResponse,
  })
  @ApiResponse({
    status: 200,
    headers: {
      'Set-Cookie': {
        description:
          'Contains access_token and refresh_token as HTTP-only cookies',
        schema: {
          type: 'string',
        },
      },
    },
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
  async signin(
    @Request() req: ExpressRequest & { user: PublicUser },
    @Res() res: Response,
  ): Promise<Response> {
    const deviceId: string = req.cookies['deviceId'];
    if (!deviceId) {
      throw new BadRequestException('Device ID is required');
    }
    const [user, tokens] = await this.authService.signin(req.user, deviceId);
    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return res.json(user);
  }

  /* ---------------------- Sign out ---------------------- */
  @ApiOperation({ summary: 'Sign out user' })
  @ApiOkResponse({ description: 'User successfully signed out' })
  @ApiUnauthorizedResponse({ description: 'Invalid token or CSRF token' })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - maximum 5 requests per minute allowed',
  })
  @ApiCookieAuth('accessToken')
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
    @Res() res: Response,
  ): Promise<void> {
    const deviceId = req.cookies['deviceId'];
    await this.authService.signout(req.user, deviceId as string);
    this.cookieService.clearAuthCookies(res);
    res.json({ message: 'Successfully signed out' });
  }

  /* ---------------------- Refresh access token ---------------------- */
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({
    description:
      'New access and refresh tokens generated and set in HTTP-only cookies',
    type: AuthUserResponse,
  })
  @ApiCookieAuth('refreshToken')
  @ApiUnauthorizedResponse({
    description: 'Invalid refresh token or CSRF token',
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
  @UseGuards(CsrfGuard, RefreshTokenAuthGuard, ThrottlerGuard)
  @Post('refresh')
  async refreshToken(
    @Request() req: ExpressRequest & { user: PublicUser },
    @Res() res: Response,
  ): Promise<Response> {
    // Token validation already happens in the RefreshTokenAuthGuard
    const [user, tokens] = await this.authService.renewAccessToken(req.user);

    // Set new tokens in cookies
    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return res.json(user);
  }

  /* ---------------------- Get authenticated user ---------------------- */
  @ApiOperation({ summary: 'Get authenticated user' })
  @ApiOkResponse({
    description: 'Returns the authenticated user',
    type: AuthUserResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid access token or CSRF token',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - maximum 5 requests per minute allowed',
  })
  @ApiCookieAuth('deviceId')
  @ApiCookieAuth('accessToken')
  @ApiHeader({
    name: 'x-csrf-token',
    description: 'CSRF token required',
    required: true,
  })
  @ApiBearerAuth('access-token')
  @UseGuards(CsrfGuard, AccessTokenAuthGuard)
  @Get('me')
  me(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
  ): AuthenticatedUser {
    return req.user;
  }
}
