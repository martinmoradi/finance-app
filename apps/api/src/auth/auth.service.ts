import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserService } from '@/user/user.service';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from 'argon2';

/**
 * Service handling authentication-related operations.
 * Provides methods for user registration and authentication.
 */
@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  /**
   * Creates a new user account.
   * @param createUserDto - Data transfer object containing user registration details.
   * @returns Newly created user object.
   * @throws ConflictException if a user with the provided email already exists.
   */
  async signup(createUserDto: CreateUserDto) {
    // Separate password from other user data for secure handling
    const { password, ...userData } = createUserDto;

    // Check if user already exists with provided email
    const existingUser = await this.userService.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password before storing
    const hashedPassword = await hash(password);

    // Create and return new user with hashed password
    const user = await this.userService.create({
      ...userData,
      password: hashedPassword,
    });
    return user;
  }

  /**
   * Validates a user's credentials for local authentication.
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns The validated user object if credentials are valid.
   * @throws UnauthorizedException if the user is not found or the password is invalid.
   */
  async validateLocalUser(email: string, password: string) {
    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password matches stored hash
    const isPasswordValid = await verify(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return minimal user info for authentication
    return { id: user.id, email: user.email, name: user.name };
  }
}
