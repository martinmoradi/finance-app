import {
  AuthenticationFailedException,
  AuthRepositoryException,
  InvalidCredentialsException,
  SignoutFailedException,
  SignupFailedException,
  TokenGenerationFailedException,
  TokenType,
} from '@/auth/exceptions/';
import { SigninFailedException } from '@/auth/exceptions/signin-failed.exception';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { LoggerService } from '@/logger/logger.service';
import {
  InvalidRefreshTokenException,
  SessionCreationFailedException,
  SessionLimitExceededException,
  SessionRepositoryException,
  SessionValidationException,
} from '@/session/exceptions';
import { SessionService } from '@/session/session.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
} from '@/user/exceptions';
import { UserService } from '@/user/user.service';
import { parseDuration } from '@/utils/parse-duration';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthenticatedUser,
  AuthTokens,
  DatabaseUser,
  JwtPayload,
  PublicUser,
} from '@repo/types';
import { hash, verify } from 'argon2';

/**
 * Handles authentication operations including user registration, login, token management,
 * and session handling. Manages JWT tokens and session validation.
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
   * Registers a new user with email/password and creates an initial session
   * @throws {UserAlreadyExistsException} If email is already registered
   * @throws {SignupFailedException} For any registration failure after email check
   */
  async signup(
    createUserDto: CreateUserDto,
    deviceId: string,
  ): Promise<AuthenticatedUser> {
    try {
      const { password, ...userData } = createUserDto;
      this.logger.debug('User signup attempt...', {
        email: userData.email,
        deviceId,
      });

      // Check if email is already registered
      const existingUser = await this.userService.findByEmail(userData.email);
      if (existingUser) {
        this.logger.warn('Signup failed - email already exists', {
          email: userData.email,
          deviceId,
        });
        throw new UserAlreadyExistsException(userData.email);
      }

      // Create user with hashed password
      let databaseUser: DatabaseUser;
      try {
        const hashedPassword = await hash(password);
        const result = await this.userService.create({
          ...userData,
          password: hashedPassword,
        });

        if (!result) {
          throw new AuthRepositoryException('create', 'new-user');
        }
        databaseUser = result;
      } catch (error) {
        this.logger.error('Error during user signup', error);
        throw new AuthRepositoryException('create', 'new-user', error as Error);
      }

      // Generate auth tokens and create session
      let tokens: AuthTokens;
      try {
        tokens = await this.generateAuthTokens(databaseUser.id);
      } catch (error) {
        this.logger.error('Error during token generation', error);
        throw new TokenGenerationFailedException(
          TokenType.GENERATION,
          error as Error,
        );
      }

      try {
        const expiresAt = this.calculateRefreshTokenExpiration(
          this.jwtRefreshConfiguration.expiresIn,
        );
        await this.createAuthSession(
          databaseUser.id,
          deviceId,
          tokens.refreshToken,
          expiresAt,
        );
      } catch (error) {
        // Handle session limit exception
        if (error instanceof SessionLimitExceededException) {
          this.logger.warn('Session limit exceeded during signup', {
            userId: databaseUser.id,
          });
          return { ...this.sanitizeUserData(databaseUser), ...tokens }; // Return user despite session limit
        }
        // Existing rollback logic
        try {
          await this.userService.delete(databaseUser.id);
          this.logger.debug('Rollback: User cleanup successful', {
            userId: databaseUser.id,
          });
        } catch (cleanupError) {
          this.logger.error(
            'Failed to cleanup user after session creation failed',
            {
              userId: databaseUser.id,
              error: cleanupError,
            },
          );
        }
        throw error;
      }

      const publicUser = this.sanitizeUserData(databaseUser);
      this.logger.info('User signup successful', {
        userId: databaseUser.id,
        email: publicUser.email,
        deviceId,
      });

      return { ...publicUser, ...tokens };
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof UserAlreadyExistsException ||
        error instanceof TokenGenerationFailedException
      ) {
        throw error;
      }

      // Handle session-related errors
      if (
        error instanceof SessionValidationException ||
        error instanceof SessionCreationFailedException
      ) {
        throw new SignupFailedException(error);
      }

      this.logger.error('Unexpected error during user signup', error, {
        email: createUserDto.email,
        deviceId,
      });
      throw new SignupFailedException(error as Error);
    }
  }

  /**
   * Authenticates an existing user and creates a new session
   * @throws {TokenGenerationFailedException} If token creation fails
   * @throws {SigninFailedException} For unexpected errors during login
   */
  async signin(user: PublicUser, deviceId: string): Promise<AuthenticatedUser> {
    try {
      const tokens = await this.generateAuthTokens(user.id);
      const expiresAt = this.calculateRefreshTokenExpiration(
        this.jwtRefreshConfiguration.expiresIn,
      );

      try {
        await this.createAuthSession(
          user.id,
          deviceId,
          tokens.refreshToken,
          expiresAt,
        );
      } catch (error) {
        // Wrap session creation errors
        throw new SigninFailedException(error as Error);
      }

      return { ...user, ...tokens };
    } catch (error) {
      if (error instanceof TokenGenerationFailedException) {
        throw error;
      }
      this.logger.error('Signin process failed', error, {
        userId: user.id,
        deviceId,
      });
      throw error; // Already wrapped
    }
  }

  /**
   * Invalidates a user's session for the specified device
   * @throws {SignoutFailedException} If session deletion fails
   */
  async signout(user: PublicUser, deviceId: string): Promise<void> {
    try {
      await this.sessionService.deleteSession(user.id, deviceId);
      this.logger.info('User signout successful', {
        userId: user.id,
        email: user.email,
        deviceId,
      });
    } catch (error) {
      const wrappedError = new SignoutFailedException(error as Error);
      this.logger.error('Error during user signout', wrappedError);
      throw wrappedError;
    }
  }

  /* -------------- Validation Methods -------------- */

  /**
   * Verifies email/password combination and returns user if valid
   * @throws {UserNotFoundException} If no user exists with provided email
   * @throws {InvalidCredentialsException} If password verification fails
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<PublicUser> {
    try {
      this.logger.debug('Validating user credentials...', { email });

      // Find user by email
      const databaseUser = await this.userService.findByEmail(email);
      if (!databaseUser) {
        this.logger.warn('Invalid credentials - user not found', { email });
        throw new UserNotFoundException();
      }

      // Verify password
      const isPasswordValid = await verify(databaseUser.password, password);
      if (!isPasswordValid) {
        this.logger.warn('Invalid credentials - incorrect password', { email });
        throw new InvalidCredentialsException();
      }

      this.logger.info('Credentials validation successful', { email });
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      if (
        error instanceof UserNotFoundException ||
        error instanceof InvalidCredentialsException
      ) {
        throw error;
      }
      this.logger.error('Error during credentials validation', error);
      throw new AuthenticationFailedException(error as Error);
    }
  }

  /**
   * Validates access token and associated session
   * @throws {AuthenticationFailedException} If user or session validation fails
   */
  async validateAccessToken(
    userId: string,
    deviceId: string,
  ): Promise<PublicUser> {
    this.logger.debug('Validating access token...', { userId, deviceId });

    try {
      // Verify user exists and has valid session
      const [databaseUser, session] = await Promise.all([
        this.userService.findByIdOrThrow(userId),
        this.sessionService.findAndVerifySession(userId, deviceId),
      ]);

      this.logger.info('Access token validation successful', {
        userId,
        deviceId,
      });
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      this.logger.error('Access token validation failed', error, {
        userId,
        deviceId,
      });
      throw new AuthenticationFailedException(error as Error);
    }
  }

  /**
   * Validates refresh token and associated session
   * @throws {AuthenticationFailedException} If token or session is invalid
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
    deviceId: string,
  ): Promise<PublicUser> {
    this.logger.debug('Validating refresh token...', { userId, deviceId });

    try {
      const databaseUser = await this.userService.findByIdOrThrow(userId);
      await this.sessionService.validateSession(userId, deviceId, refreshToken);
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      // Add handling for repository errors
      if (error instanceof SessionRepositoryException) {
        throw new AuthenticationFailedException(error);
      }
      if (error instanceof InvalidRefreshTokenException) {
        throw new AuthenticationFailedException(error);
      }
      throw new AuthenticationFailedException(error as Error);
    }
  }

  /**
   * Generates new access/refresh tokens and updates session
   * @throws {TokenGenerationFailedException} If token creation fails
   */
  async renewAccessToken(user: PublicUser): Promise<AuthenticatedUser> {
    try {
      // Generate new tokens
      const tokens = await this.generateAuthTokens(user.id);

      this.logger.info('Access token renewal successful', {
        userId: user.id,
        email: user.email,
      });
      return { ...user, ...tokens };
    } catch (error) {
      this.logger.error('Access token renewal failed', error, {
        userId: user.id,
      });
      throw new TokenGenerationFailedException(
        TokenType.RENEWAL,
        error as Error,
      );
    }
  }

  /* -------------- Private Helper Methods -------------- */

  /**
   * Generates JWT access and refresh tokens for a user
   * @throws {TokenGenerationFailedException} If either token generation fails
   */
  private async generateAuthTokens(userId: string): Promise<AuthTokens> {
    this.logger.debug('Generating auth tokens...', { userId });

    try {
      const payload: JwtPayload = { sub: userId };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload),
        this.jwtService.signAsync(payload, this.jwtRefreshConfiguration),
      ]);

      this.logger.debug('Auth tokens generated successfully', {
        userId,
        tokenExpiration: this.jwtRefreshConfiguration.expiresIn,
      });
      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to generate auth tokens', error, { userId });
      throw new TokenGenerationFailedException(
        TokenType.GENERATION,
        error as Error,
      );
    }
  }

  /** Removes sensitive fields from user object before exposing to client */
  private sanitizeUserData(user: DatabaseUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  /** Converts JWT expiration configuration to concrete Date object */
  private calculateRefreshTokenExpiration(expiresIn: string | number): Date {
    if (typeof expiresIn === 'string') {
      const durationInMs = parseDuration(expiresIn);
      return new Date(Date.now() + durationInMs);
    }
    return new Date(Date.now() + expiresIn * 1000);
  }

  /** Creates session record with refresh token and expiration */
  private async createAuthSession(
    userId: string,
    deviceId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      await this.sessionService.createSessionWithToken(
        userId,
        deviceId,
        refreshToken,
        expiresAt,
      );
    } catch (error) {
      this.logger.error('Session creation failed', error, { userId, deviceId });
      throw error;
    }
  }
}
