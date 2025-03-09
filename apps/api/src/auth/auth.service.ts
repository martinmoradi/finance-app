import {
  AuthenticationFailedException,
  AuthRepositoryException,
  InvalidCredentialsException,
  InvalidDeviceIdException,
  SignoutFailedException,
  SignupFailedException,
  TokenGenerationFailedException,
  TokenType,
  TokenValidationFailedException,
} from '@/auth/exceptions/';
import { SigninFailedException } from '@/auth/exceptions/signin-failed.exception';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { LoggerService } from '@/logger/logger.service';
import {
  InvalidRefreshTokenException,
  SessionCreationFailedException,
  SessionExpiredException,
  SessionLimitExceededException,
  SessionRefreshFailedException,
  SessionRepositoryException,
  SessionValidationException,
} from '@/session/exceptions';
import { SessionService } from '@/session/session.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
  UserRepositoryException,
} from '@/user/exceptions';
import { UserService } from '@/user/user.service';
import { parseDuration } from '@/utils/parse-duration';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokens, DatabaseUser, JwtPayload, PublicUser } from '@repo/types';
import { hash, verify } from 'argon2';

/**
 * Service handling authentication, user sessions, and token management
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfiguration: ConfigType<
      typeof refreshJwtConfig
    >,
  ) {}

  /* -------------- Public Authentication Methods -------------- */

  /**
   * Registers new user and creates initial session
   * @throws {UserAlreadyExistsException} Email already registered
   * @throws {SignupFailedException} Registration process failed
   */
  async signup(
    createUserDto: CreateUserDto,
    deviceId: string,
  ): Promise<[PublicUser, AuthTokens]> {
    const { password, ...userData } = createUserDto;

    this.logger.debug('Starting user signup', {
      email: createUserDto.email,
      deviceId,
      action: 'signup',
    });
    try {
      // 1. Device ID validation
      this.validateDeviceId(deviceId);

      // 2. Check for existing user
      const existingUser = await this.userService.findByEmail(userData.email);
      if (existingUser) {
        this.logger.warn('User already exists', {
          email: userData.email,
          action: 'signup',
        });
        throw new UserAlreadyExistsException(userData.email);
      }

      // 3. Create user with hashed password
      const hashedPassword = await hash(password);
      const databaseUser = await this.userService.create({
        ...userData,
        password: hashedPassword,
      });

      // 4. Generate tokens
      const [[accessToken, refreshToken], refreshTokenId] =
        await this.generateAuthTokens(databaseUser.id);

      // 5. Create session with refresh token
      try {
        const expiresAt = this.calculateRefreshTokenExpiration(
          this.jwtRefreshConfiguration.expiresIn,
        );
        await this.sessionService.createSessionWithToken({
          userId: databaseUser.id,
          deviceId,
          token: refreshToken,
          tokenId: refreshTokenId,
          expiresAt,
        });
      } catch (error) {
        // If user has reached max sessions, log warning but allow signup to complete
        if (error instanceof SessionLimitExceededException) {
          this.logger.warn('Session limit exceeded during signup', {
            userId: databaseUser.id,
            action: 'signup',
          });
          return [
            this.sanitizeUserData(databaseUser),
            [accessToken, refreshToken],
          ];
        }

        // If session creation failed for any other reason, try to clean up the created user
        try {
          await this.userService.delete(databaseUser.id);
        } catch (cleanupError) {
          // If cleanup fails, log error but continue with original error handling
          this.logger.error(
            'Failed to cleanup user after session creation failed',
            {
              userId: databaseUser.id,
              action: 'signup',
              error: cleanupError,
            },
          );
        }
        throw error;
      }

      // 6. Sanitize user data and log success
      const publicUser = this.sanitizeUserData(databaseUser);
      this.logger.info('User signup completed successfully', {
        userId: databaseUser.id,
        email: publicUser.email,
        deviceId,
        action: 'signup',
      });

      // 7. Return sanitized user and tokens
      return [publicUser, [accessToken, refreshToken]];
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof UserRepositoryException ||
        error instanceof SessionRepositoryException ||
        error instanceof TokenGenerationFailedException ||
        error instanceof SessionCreationFailedException ||
        error instanceof InvalidDeviceIdException
      ) {
        throw new SignupFailedException(error);
      }
      // Let error return to controller for 409 conflict
      if (error instanceof UserAlreadyExistsException) {
        throw error;
      }
      // Already wrapped errors - don't log again
      if (error instanceof SignupFailedException) {
        throw error;
      }
      // Unexpected errors
      this.logger.error('Unexpected error during signup', {
        error: error as Error,
        email: createUserDto.email,
        action: 'signup',
      });
      throw new SignupFailedException(error as Error);
    }
  }

  /**
   * Authenticates user and creates new session
   * @throws {SigninFailedException} Authentication process failed
   * @throws {TokenGenerationFailedException} Token creation failed
   */
  async signin(
    user: PublicUser,
    deviceId: string,
  ): Promise<[PublicUser, AuthTokens]> {
    try {
      this.logger.debug('Starting user signin', {
        userId: user.id,
        deviceId,
        action: 'signin',
      });

      // 1. Validate device ID
      this.validateDeviceId(deviceId);

      // 2. Generate tokens
      const [[accessToken, refreshToken], refreshTokenId] =
        await this.generateAuthTokens(user.id);

      // 3. Create session with refresh token
      const expiresAt = this.calculateRefreshTokenExpiration(
        this.jwtRefreshConfiguration.expiresIn,
      );
      await this.sessionService.createSessionWithToken({
        userId: user.id,
        deviceId,
        token: refreshToken,
        tokenId: refreshTokenId,
        expiresAt,
      });

      // 4. Log success and return user and tokens
      this.logger.info('User signin successful', {
        userId: user.id,
        email: user.email,
        deviceId,
        action: 'signin',
      });
      return [user, [accessToken, refreshToken]];
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof TokenGenerationFailedException ||
        error instanceof SigninFailedException ||
        error instanceof InvalidDeviceIdException ||
        error instanceof AuthRepositoryException ||
        error instanceof InvalidDeviceIdException
      ) {
        throw new SigninFailedException(error as Error);
      }
      // Already wrapped errors - don't log again
      if (error instanceof SigninFailedException) {
        throw error;
      }
      // Truly unexpected errors
      this.logger.error('Unexpected error during user signin', error, {
        userId: user.id,
        deviceId,
        action: 'signin',
      });
      throw new SigninFailedException(error as Error);
    }
  }

  /**
   * Invalidates user session for specified device
   * @throws {SignoutFailedException} Session deletion failed
   */
  async signout(user: PublicUser, deviceId: string): Promise<void> {
    this.logger.debug('Starting user signout', {
      userId: user.id,
      deviceId,
      action: 'signout',
    });
    try {
      // 1. Validate device ID
      this.validateDeviceId(deviceId);

      // 2. Delete session
      await this.sessionService.deleteSession({
        userId: user.id,
        deviceId,
      });

      // 3. Log success
      this.logger.info('User signout successful', {
        userId: user.id,
        email: user.email,
        deviceId,
        action: 'signout',
      });
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof SessionRepositoryException ||
        error instanceof InvalidDeviceIdException
      ) {
        throw new SignoutFailedException(error);
      }
      // Already wrapped errors - don't log again
      if (error instanceof SignoutFailedException) {
        throw error;
      }
      // Truly unexpected errors
      this.logger.error('Unexpected error during user signout', error, {
        userId: user.id,
        deviceId,
        action: 'signout',
      });
      throw new SignoutFailedException(error as Error);
    }
  }

  /* -------------- Validation Methods -------------- */

  /**
   * Validates user credentials
   * @throws {AuthenticationFailedException}
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<PublicUser> {
    try {
      this.logger.debug('Starting credentials validation', {
        email,
        action: 'validateCredentials',
      });

      // 1. Find user by email
      const databaseUser = await this.userService.findByEmailOrThrow(email);

      // 2. Verify password
      const isPasswordValid = await verify(databaseUser.password, password);
      if (!isPasswordValid) {
        throw new InvalidCredentialsException();
      }

      // 3. Log success and return sanitized user
      this.logger.info('Credentials validation successful', {
        email,
        action: 'validateCredentials',
      });
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (error instanceof UserRepositoryException) {
        throw new AuthenticationFailedException(error as Error);
      }

      // Log business validation errors
      if (
        error instanceof InvalidCredentialsException ||
        error instanceof UserNotFoundException
      ) {
        this.logger.warn('Credentials validation failed - validation error', {
          errorType: error.constructor.name,
          reason: error.message,
          email,
        });
        throw new AuthenticationFailedException(error);
      }

      if (error instanceof AuthenticationFailedException) {
        throw error;
      }

      // Truly unexpected errors
      this.logger.error(
        'Unexpected error during credentials validation',
        error,
        {
          email,
          action: 'validateCredentials',
        },
      );

      throw new AuthenticationFailedException(error as Error);
    }
  }

  /**
   * Validates access token and session
   * @throws {TokenValidationFailedException("access")} Token or session validation failed
   */
  async validateAccessToken(
    userId: string,
    deviceId: string,
  ): Promise<PublicUser> {
    this.logger.debug('Starting access token validation', {
      userId,
      deviceId,
      action: 'validateAccessToken',
    });

    try {
      // 1. Validate device ID
      this.validateDeviceId(deviceId);

      // 2. Verify user exists and has valid session
      const [databaseUser] = await Promise.all([
        this.userService.findByIdOrThrow(userId),
        this.sessionService.verifySession({ userId, deviceId }),
      ]);

      // 3. Log success and return sanitized user
      this.logger.info('Access token validation successful', {
        userId,
        deviceId,
        action: 'validateAccessToken',
      });
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof UserRepositoryException ||
        error instanceof SessionValidationException ||
        error instanceof InvalidDeviceIdException ||
        error instanceof UserNotFoundException ||
        error instanceof SessionExpiredException
      ) {
        throw new TokenValidationFailedException('access', error);
      }
      // Already wrapped errors - don't log again
      if (error instanceof TokenValidationFailedException) {
        throw error;
      }
      // Truly unexpected errors
      this.logger.error(
        'Unexpected error during access token validation',
        error,
        {
          userId,
          deviceId,
          action: 'validateAccessToken',
        },
      );
      throw new TokenValidationFailedException('access', error as Error);
    }
  }

  /**
   * Validates refresh token and session
   * @throws {TokenValidationFailedException("refresh")} Token or session validation failed
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
    deviceId: string,
  ): Promise<PublicUser> {
    this.logger.debug('Starting refresh token validation', {
      userId,
      deviceId,
      action: 'validateRefreshToken',
    });

    try {
      // 1. Validate device ID
      this.validateDeviceId(deviceId);

      // 2. Find user by ID
      const databaseUser = await this.userService.findByIdOrThrow(userId);

      // 3. Validate session
      const session = await this.sessionService.getValidSession({
        userId,
        deviceId,
      });

      // 4. Check if token has been rotated
      const payload: JwtPayload = this.jwtService.decode(refreshToken);
      if (payload.jti !== session.tokenId) {
        this.logger.warn('Token rotation detected - token reuse attempt', {
          userId,
          deviceId,
          action: 'validateRefreshToken',
        });
        throw new InvalidRefreshTokenException();
      }

      // 5. Log success and return sanitized user
      this.logger.info('Refresh token validation successful', {
        userId,
        deviceId,
        action: 'validateRefreshToken',
      });
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof SessionRepositoryException ||
        error instanceof UserNotFoundException ||
        error instanceof InvalidRefreshTokenException ||
        error instanceof InvalidDeviceIdException ||
        error instanceof SessionValidationException ||
        error instanceof UserRepositoryException
      ) {
        throw new TokenValidationFailedException('refresh', error);
      }
      if (error instanceof TokenValidationFailedException) {
        throw error;
      }
      this.logger.error(
        'Unexpected error during refresh token validation',
        error,
        {
          userId,
          deviceId,
        },
      );
      throw new TokenValidationFailedException('refresh', error as Error);
    }
  }

  /**
   * Generates new token pair and updates session
   * @throws {TokenGenerationFailedException} Token refresh failed
   */
  async refreshTokens(
    user: PublicUser,
    deviceId: string,
  ): Promise<[PublicUser, AuthTokens]> {
    this.logger.debug('Starting tokens refresh', {
      userId: user.id,
      deviceId,
      action: 'refreshTokens',
    });
    try {
      // 1. Validate device ID
      this.validateDeviceId(deviceId);

      // 2. Generate new tokens
      const [[accessToken, refreshToken], refreshTokenId] =
        await this.generateAuthTokens(user.id);

      // 3. Refresh session with new token
      const hashedRefreshToken = await hash(refreshToken);
      await this.sessionService.refreshSessionWithToken({
        userId: user.id,
        deviceId,
        token: hashedRefreshToken,
        tokenId: refreshTokenId,
      });

      // 4. Log success and return user and tokens
      this.logger.info('Tokens refreshed successfully', {
        userId: user.id,
        email: user.email,
        deviceId,
        action: 'refreshTokens',
      });
      return [user, [accessToken, refreshToken]];
    } catch (error) {
      // Let lower-level errors propagate (already logged)
      if (
        error instanceof SessionRefreshFailedException ||
        error instanceof InvalidDeviceIdException
      ) {
        throw new TokenGenerationFailedException(TokenType.REFRESH, error);
      }
      // Already wrapped errors - don't log again
      if (error instanceof TokenGenerationFailedException) {
        throw error;
      }
      // Truly unexpected errors
      this.logger.error('Unexpected error during tokens refresh', error, {
        userId: user.id,
        deviceId,
        action: 'refreshTokens',
      });
      throw new TokenGenerationFailedException(
        TokenType.REFRESH,
        error as Error,
      );
    }
  }

  /* -------------- Private Helper Methods -------------- */

  /**
   * Generates access and refresh JWT tokens
   * @throws {TokenGenerationFailedException} Token generation failed
   */
  private async generateAuthTokens(
    userId: string,
  ): Promise<[AuthTokens, string]> {
    this.logger.debug('Starting token generation', {
      userId,
      action: 'generateAuthTokens',
    });
    try {
      // 1. Generate a unique ID for the refresh token
      const refreshTokenId = crypto.randomUUID();

      // 2. Create the access token payload
      const accessPayload: JwtPayload = { sub: userId };

      // 3. Create the refresh token payload
      const refreshPayload: JwtPayload = {
        sub: userId,
        jti: refreshTokenId,
      };

      // 4. Generate the tokens
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(accessPayload),
        this.jwtService.signAsync(refreshPayload, this.jwtRefreshConfiguration),
      ]);

      // 5. Return the tokens and refresh token ID
      return [[accessToken, refreshToken], refreshTokenId];
    } catch (error) {
      this.logger.error('Failed to generate auth tokens', error as Error, {
        userId,
        action: 'generateAuthTokens',
      });
      throw new TokenGenerationFailedException(
        TokenType.GENERATION,
        error as Error,
      );
    }
  }

  /** Removes sensitive data from user object */
  private sanitizeUserData(user: DatabaseUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  /** Converts JWT expiration to Date object */
  private calculateRefreshTokenExpiration(expiresIn: string | number): Date {
    if (typeof expiresIn === 'string') {
      const durationInMs = parseDuration(expiresIn);
      return new Date(Date.now() + durationInMs);
    }
    return new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Validates device ID format
   * @throws {InvalidDeviceIdException} Invalid device ID format
   */
  validateDeviceId(deviceId: string): void {
    // UUID v4 regex pattern
    const uuidV4Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Pattern.test(deviceId)) {
      this.logger.warn('Invalid device ID format', { deviceId });
      throw new InvalidDeviceIdException();
    }
  }
}
