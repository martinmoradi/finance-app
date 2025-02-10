import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserService } from '@/user/user.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'argon2';

/**
 * Service handling authentication-related operations
 */
@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  /**
   * Creates a new user account
   * @param createUserDto - Data transfer object containing user registration details
   * @returns Newly created user object
   * @throws ConflictException if a user with the provided email already exists
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
}
