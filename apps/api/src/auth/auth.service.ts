import refreshJwtConfig from '@/config/refresh-jwt.config';
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
  DatabaseUser,
  JwtPayload,
  PublicUser,
} from '@repo/types';
import { hash, verify } from 'argon2';

/**
 * Service responsible for handling authentication-related operations including
 * user registration, login, and token management.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private readonly jwtRefreshConfiguration: ConfigType<
      typeof refreshJwtConfig
    >,
  ) {}

  // Core Authentication Methods

  /**
   * Registers a new user in the system.
   *
   * @example
   * const newUser = await authService.signup({
   *   email: 'user@example.com',
   *   password: 'securePassword123',
   *   name: 'John Doe'
   * });
   *
   * @param createUserDto - User registration data containing email, password, and name
   * @returns Promise containing authenticated user data and tokens
   * @throws {ConflictException} When user with the same email exists
   * @throws {InternalServerErrorException} When user creation fails
   */
  async signup(createUserDto: CreateUserDto): Promise<AuthenticatedUser> {
    const { password, ...userData } = createUserDto;
    const existingUser = await this.userService.findByEmail(userData.email);

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await hash(password);
    const databaseUser = await this.userService.create({
      ...userData,
      password: hashedPassword,
    });

    if (!databaseUser) {
      throw new InternalServerErrorException('Failed to create user');
    }

    const tokens = await this.generateAuthTokens(databaseUser.id);
    const publicUser = this.sanitizeUserData(databaseUser);

    return { ...publicUser, ...tokens };
  }

  /**
   * Authenticates a user and generates new access and refresh tokens.
   *
   * @example
   * const authenticatedUser = await authService.signin(validatedUser);
   *
   * @param user - Validated public user object
   * @returns Promise containing user data and new authentication tokens
   */
  async signin(user: PublicUser): Promise<AuthenticatedUser> {
    const { accessToken, refreshToken } = await this.generateAuthTokens(
      user.id,
    );
    const hashedRefreshToken = await hash(refreshToken);

    await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

    return { ...user, accessToken, refreshToken };
  }

  /**
   * Invalidates a user's refresh token during logout.
   *
   * @param user - Public user object to sign out
   */
  async signout(user: PublicUser): Promise<void> {
    await this.userService.updateRefreshToken(user.id, null);
  }

  // Validation Methods

  /**
   * Validates user credentials for email/password authentication.
   *
   * @example
   * const user = await authService.validateLocalUser('user@example.com', 'password123');
   *
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise containing public user data
   * @throws {UnauthorizedException} When credentials are invalid
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<PublicUser> {
    const databaseUser = await this.userService.findByEmail(email);

    if (!databaseUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await verify(databaseUser.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sanitizeUserData(databaseUser);
  }

  /**
   * Validates a user based on their JWT payload.
   *
   * @param userId - User's ID from JWT payload
   * @returns Promise containing public user data
   * @throws {UnauthorizedException} When user is not found
   */
  async validateAccessToken(userId: string): Promise<PublicUser> {
    const databaseUser = await this.findUserById(userId);
    return this.sanitizeUserData(databaseUser);
  }

  /**
   * Validates a refresh token for a specific user.
   *
   * @param userId - User's unique identifier
   * @param refreshToken - Refresh token to validate
   * @returns Promise containing public user data
   * @throws {UnauthorizedException} When token is invalid or not found
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<PublicUser> {
    const databaseUser = await this.findUserById(userId);
    if (!databaseUser.refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const isRefreshTokenValid = await verify(
      databaseUser.refreshToken,
      refreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.sanitizeUserData(databaseUser);
  }

  // Token Management

  /**
   * Generates new access and refresh tokens for a user.
   *
   * @param user - Public user object
   * @returns Promise containing user data and new tokens
   */
  async renewAccessToken(user: PublicUser): Promise<AuthenticatedUser> {
    const tokens = await this.generateAuthTokens(user.id);
    return { ...user, ...tokens };
  }

  // Private Utility Methods

  /**
   * Generates new JWT access and refresh tokens.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing access and refresh tokens
   */
  private async generateAuthTokens(userId: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.jwtRefreshConfiguration),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Converts a database user object to a public user object.
   * Removes sensitive information like password and refresh token.
   *
   * @param user - Database user object
   * @returns Public user object without sensitive data
   */
  private sanitizeUserData(user: DatabaseUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  /**
   * Retrieves a user from the database by ID.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing database user object
   * @throws {UnauthorizedException} When user is not found
   */
  private async findUserById(userId: string): Promise<DatabaseUser> {
    const databaseUser = await this.userService.findById(userId);
    if (!databaseUser) {
      throw new UnauthorizedException('User not found');
    }
    return databaseUser;
  }
}
