import refreshJwtConfig from '@/config/refresh-jwt.config';
import { LoggerService } from '@/logger/logger.service';
import { SessionService } from '@/session/session.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserService } from '@/user/user.service';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthenticatedUser,
  AuthTokens,
  DatabaseSession,
  DatabaseUser,
  JwtPayload,
  PublicUser,
} from '@repo/types';
import { hash, verify } from 'argon2';

/**
 * Service responsible for handling authentication-related operations including
 * user registration, login, token management and session handling.
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
  ) {
    this.logger = new LoggerService('AuthService');
  }

  /* -------------- Public Authentication Methods -------------- */

  /**
   * Registers a new user in the system and creates an authenticated session.
   *
   * @param createUserDto - User registration data containing email, password, and name
   * @param deviceId - Unique identifier for the user's device
   * @returns Promise containing authenticated user data and tokens
   * @throws {ConflictException} When user with the same email exists
   * @throws {InternalServerErrorException} When user creation fails
   */
  async signup(
    createUserDto: CreateUserDto,
    deviceId: string,
  ): Promise<AuthenticatedUser> {
    try {
      // Extract password and user data from DTO
      const { password, ...userData } = createUserDto;
      this.logger.debug('User signup attempt', {
        email: userData.email,
        deviceId,
      });

      // Check for existing user
      const existingUser = await this.userService.findByEmail(userData.email);
      if (existingUser) {
        this.logger.warn('Signup failed - email already exists', {
          email: userData.email,
          deviceId,
        });
        throw new ConflictException('User already exists');
      }

      // Create new user with hashed password
      const hashedPassword = await hash(password);
      const databaseUser = await this.userService.create({
        ...userData,
        password: hashedPassword,
      });

      // Verify user was created successfully
      if (!databaseUser) {
        this.logger.error(
          'Failed to create user in database',
          new Error('Database user creation failed'),
        );
        throw new InternalServerErrorException('Failed to create user');
      }

      // Generate auth tokens and create session
      const { accessToken, refreshToken } = await this.generateAuthTokens(
        databaseUser.id,
      );
      await this.createSession(databaseUser.id, deviceId, refreshToken);

      // Prepare and return authenticated user data
      const publicUser = this.sanitizeUserData(databaseUser);
      this.logger.info('User signup successful', {
        userId: databaseUser.id,
        email: publicUser.email,
        deviceId,
      });
      return { ...publicUser, accessToken, refreshToken };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error during user signup', error);
      throw new InternalServerErrorException(
        'Failed to complete signup process',
      );
    }
  }

  /**
   * Authenticates a user and creates a new session with tokens.
   *
   * @param user - Validated public user object
   * @param deviceId - Unique identifier for the user's device
   * @returns Promise containing authenticated user data and tokens
   */
  async signin(user: PublicUser, deviceId: string): Promise<AuthenticatedUser> {
    try {
      this.logger.debug('User signin attempt', {
        userId: user.id,
        email: user.email,
        deviceId,
      });

      // Generate new authentication tokens and create session
      const { accessToken, refreshToken } = await this.generateAuthTokens(
        user.id,
      );
      await this.createSession(user.id, deviceId, refreshToken);

      // Return authenticated user data
      this.logger.info('User signin successful', {
        userId: user.id,
        email: user.email,
        deviceId,
      });
      return { ...user, accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Error during user signin', error);
      throw new InternalServerErrorException(
        'Failed to complete signin process',
      );
    }
  }

  /**
   * Invalidates a user's session during logout.
   *
   * @param user - Public user object to sign out
   * @param deviceId - Device identifier for the session to invalidate
   */
  async signout(user: PublicUser, deviceId: string): Promise<void> {
    try {
      this.logger.debug('User signout attempt', {
        userId: user.id,
        email: user.email,
        deviceId,
      });

      // Delete user session
      await this.deleteSession(user.id, deviceId);

      this.logger.info('User signout successful', {
        userId: user.id,
        email: user.email,
        deviceId,
      });
    } catch (error) {
      this.logger.error('Error during user signout', error);
      throw new InternalServerErrorException(
        'Failed to complete signout process',
      );
    }
  }

  /* -------------- Validation Methods -------------- */

  /**
   * Validates user credentials for email/password authentication.
   *
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise containing validated public user data
   * @throws {UnauthorizedException} When credentials are invalid
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<PublicUser> {
    try {
      this.logger.debug('Validating user credentials', { email });

      // Find user by email
      const databaseUser = await this.userService.findByEmail(email);
      if (!databaseUser) {
        this.logger.warn('Invalid credentials - user not found', { email });
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await verify(databaseUser.password, password);
      if (!isPasswordValid) {
        this.logger.warn('Invalid credentials - incorrect password', { email });
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.info('Credentials validation successful', { email });
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error during credentials validation', error);
      throw new InternalServerErrorException('Failed to validate credentials');
    }
  }

  /**
   * Validates a user's access token and session.
   *
   * @param userId - User's ID from JWT payload
   * @param deviceId - Device identifier for the session
   * @returns Promise containing validated public user data
   * @throws {UnauthorizedException} When user or session is not found/valid
   */
  async validateAccessToken(
    userId: string,
    deviceId: string,
  ): Promise<PublicUser> {
    try {
      this.logger.debug('Validating access token', { userId, deviceId });

      // Verify user exists and has valid session
      const [databaseUser, session] = await Promise.all([
        this.findUserById(userId),
        this.findAndVerifySession(userId, deviceId),
      ]);

      if (!databaseUser || !session) {
        this.logger.warn('Invalid access token', { userId, deviceId });
        throw new UnauthorizedException('Invalid access token');
      }

      this.logger.info('Access token validation successful', {
        userId,
        deviceId,
      });
      return this.sanitizeUserData(databaseUser);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error during access token validation', error);
      throw new InternalServerErrorException('Failed to validate access token');
    }
  }

  /**
   * Validates a refresh token and associated session.
   *
   * @param userId - User's unique identifier
   * @param refreshToken - Refresh token to validate
   * @param deviceId - Device identifier for the session
   * @returns Promise containing validated public user data
   * @throws {UnauthorizedException} When token/session is invalid or not found
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
    deviceId: string,
  ): Promise<PublicUser> {
    this.logger.debug('Validating refresh token', { userId, deviceId });

    // Verify user exists and session is valid
    const databaseUser = await this.findUserById(userId);
    await this.sessionService.validateSession(userId, deviceId, refreshToken);

    this.logger.info('Refresh token validation successful', {
      userId,
      deviceId,
    });
    return this.sanitizeUserData(databaseUser);
  }

  /**
   * Generates new access and refresh tokens for a user.
   *
   * @param user - Public user object requiring new tokens
   * @returns Promise containing user data with new authentication tokens
   */
  async renewAccessToken(user: PublicUser): Promise<AuthenticatedUser> {
    this.logger.debug('Renewing access token', {
      userId: user.id,
      email: user.email,
    });

    // Generate new tokens
    const tokens = await this.generateAuthTokens(user.id);

    this.logger.info('Access token renewal successful', {
      userId: user.id,
      email: user.email,
    });
    return { ...user, ...tokens };
  }

  /* -------------- Private Helper Methods -------------- */

  /**
   * Generates new JWT access and refresh tokens for a user.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing newly generated access and refresh tokens
   */
  private async generateAuthTokens(userId: string): Promise<AuthTokens> {
    this.logger.debug('Generating auth tokens', { userId });

    const payload: JwtPayload = { sub: userId };

    // Generate both tokens concurrently
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.jwtRefreshConfiguration),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Creates a new session with the provided refresh token.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier for the session
   * @param refreshToken - Refresh token to associate with the session
   */
  private async createSession(
    userId: string,
    deviceId: string,
    refreshToken: string,
  ): Promise<void> {
    const expiresAt = this.calculateRefreshTokenExpiration(
      this.jwtRefreshConfiguration.expiresIn,
    );

    await this.sessionService.createSessionWithToken(
      userId,
      deviceId,
      refreshToken,
      expiresAt,
    );
  }

  /**
   * Deletes a session for a user.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier for the session to delete
   */
  private async deleteSession(userId: string, deviceId: string): Promise<void> {
    await this.sessionService.deleteSession(userId, deviceId);
  }

  /**
   * Finds and validates a session.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device identifier for the session
   * @returns Promise containing the verified session
   * @throws {UnauthorizedException} When session is not found or expired
   */
  private async findAndVerifySession(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession> {
    const session = await this.sessionService.findSession(userId, deviceId);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }
    return session;
  }

  /**
   * Retrieves and validates a user from the database.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing the found database user
   * @throws {UnauthorizedException} When user is not found
   */
  private async findUserById(userId: string): Promise<DatabaseUser> {
    const databaseUser = await this.userService.findById(userId);
    if (!databaseUser) {
      throw new UnauthorizedException('User not found');
    }
    return databaseUser;
  }

  /**
   * Removes sensitive data from user object for public exposure.
   *
   * @param user - Database user object containing sensitive data
   * @returns Public user object with only safe fields
   */
  private sanitizeUserData(user: DatabaseUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  /**
   * Calculates expiration date for refresh tokens.
   *
   * @param expiresIn - Duration string or number in seconds
   * @returns Date object representing token expiration
   */
  private calculateRefreshTokenExpiration(expiresIn: string | number): Date {
    if (typeof expiresIn === 'string') {
      const durationInMs = this.parseDuration(expiresIn);
      return new Date(Date.now() + durationInMs);
    }
    return new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Parses duration strings into milliseconds.
   *
   * @param duration - Duration string (e.g., "7d", "24h", "60m", "3600s")
   * @returns Number of milliseconds
   * @throws {Error} When duration format is invalid
   */
  private parseDuration(duration: string): number {
    const unit = duration.slice(-1);
    const valueStr = duration.slice(0, -1);
    const value = parseInt(valueStr);

    if (isNaN(value) || value.toString() !== valueStr) {
      throw new Error(`Invalid duration value: ${valueStr}`);
    }

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      case 's':
        return value * 1000;
      default:
        throw new Error(`Invalid duration unit: ${unit}`);
    }
  }
}
