import { UserRepository } from '@/user/user.repository';
import { Controller, Get, Param } from '@nestjs/common';
import { User } from '@repo/types';

/**
 * Controller responsible for handling user-related HTTP requests.
 * Provides endpoints for retrieving user information.
 */
@Controller('user')
export class UserController {
  /**
   * Creates an instance of UserController.
   * @param userRepository - Repository for user data access operations
   */
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Retrieves all users from the database.
   * @returns Promise resolving to an array of users or null if none found
   */
  @Get()
  async findAll(): Promise<User[] | null> {
    return await this.userRepository.findAll();
  }

  /**
   * Retrieves a specific user by their ID.
   * @param id - Unique identifier of the user to retrieve
   * @returns Promise resolving to the found user or null if not found
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }
}
