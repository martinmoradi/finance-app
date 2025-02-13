import { CreateUserDto } from '@/user/dto/create-user.dto';
import { LoggerService } from '@/logger/logger.service';
import { UserRepository } from '@/user/user.repository';
import { Injectable } from '@nestjs/common';
import { DatabaseUser } from '@repo/types';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger = new LoggerService('UserService');
  }

  /**
   * Finds a user by their email address.
   * @param email - The email address to search for.
   * @returns The found user or null if not found.
   */
  async findByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      this.logger.debug('Finding user by email', { email });
      return this.userRepository.findByEmail(email);
    } catch (error) {
      this.logger.error('Error finding user by email', error);
      throw error;
    }
  }

  /**
   * Creates a new user.
   * @param createUserDto - The user data for creation.
   * @returns The newly created user or null if creation fails.
   */
  async create(createUserDto: CreateUserDto): Promise<DatabaseUser | null> {
    try {
      this.logger.debug('Creating user', { createUserDto });
      return this.userRepository.create(createUserDto);
    } catch (error) {
      this.logger.error('Error creating user', error);
      throw error;
    }
  }

  /**
   * Finds a user by their ID
   * @param id - The user ID to search for
   * @returns The found user or null if not found
   */
  async findById(id: string): Promise<DatabaseUser | null> {
    try {
      this.logger.debug('Finding user by ID', { id });
      return this.userRepository.findById(id);
    } catch (error) {
      this.logger.error('Error finding user by ID', error);
      throw error;
    }
  }
}
