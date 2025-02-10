import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserRepository } from '@/user/user.repository';
import { Injectable } from '@nestjs/common';

/**
 * Service for managing user-related business logic.
 * Provides methods for user operations like finding and creating users.
 */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Finds a user by their email address.
   * @param email - The email address to search for.
   * @returns The found user or null if not found.
   */
  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Creates a new user.
   * @param createUserDto - Data transfer object containing user creation data.
   * @returns The newly created user or null if creation fails.
   */
  async create(createUserDto: CreateUserDto) {
    return this.userRepository.create(createUserDto);
  }
}
