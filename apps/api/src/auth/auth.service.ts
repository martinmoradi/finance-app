import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserService } from '@/user/user.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
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
  ) {}

  /**
   * Registers a new user in the system.
   * @param createUserDto - Contains email, name and password fields with validation rules.
   * @returns Authenticated user object containing user details and authentication tokens
   * @throws ConflictException when user with the same email already exists
   * @throws InternalServerErrorException when user creation fails
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

    const tokens = await this.generateJwtTokens(databaseUser.id);
    const publicUser = this.toPublicUser(databaseUser);

    return { ...publicUser, ...tokens };
  }

  /**
   * Validates user credentials for local authentication strategy.
   * @param email - User's email address
   * @param password - User's password (plain text)
   * @returns Public user object if validation succeeds
   * @throws UnauthorizedException when credentials are invalid
   */
  async validateLocalUser(
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

    return this.toPublicUser(databaseUser);
  }

  /**
   * Signs in a validated user by generating authentication tokens.
   * @param user - Validated public user object
   * @returns Authenticated user object containing user details and new tokens
   */
  async signin(user: PublicUser): Promise<AuthenticatedUser> {
    const tokens = await this.generateJwtTokens(user.id);
    return { ...user, ...tokens };
  }

  /**
   * Validates a user based on JWT payload information.
   * @param userId - User's unique identifier from JWT payload
   * @returns Public user object if user exists
   * @throws UnauthorizedException when user is not found
   */
  async validateJwtUser(userId: string): Promise<PublicUser> {
    const databaseUser = await this.userService.findById(userId);
    if (!databaseUser) {
      throw new UnauthorizedException('User not found');
    }

    return this.toPublicUser(databaseUser);
  }

  /**
   * Generates JWT access and refresh tokens for a user.
   * @param userId - User's unique identifier
   * @returns Object containing access and refresh tokens
   * @private
   */
  private async generateJwtTokens(userId: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      Promise.resolve('dummy refresh token'), // TODO: Implement proper refresh token generation
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Converts a database user object to a public user object by removing sensitive information.
   * @param user - Database user object containing all user information
   * @returns Public user object with only non-sensitive information
   * @private
   */
  private toPublicUser(user: DatabaseUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
