import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserRepository } from '@/user/user.repository';
import { Injectable } from '@nestjs/common';
import { DatabaseUser } from '@repo/types';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Finds a user by their email address.
   * @param email - The email address to search for.
   * @returns The found user or null if not found.
   */
  async findByEmail(email: string): Promise<DatabaseUser | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Creates a new user.
   * @param createUserDto - The user data for creation.
   * @returns The newly created user or null if creation fails.
   */
  async create(createUserDto: CreateUserDto): Promise<DatabaseUser | null> {
    return this.userRepository.create(createUserDto);
  }

  /**
   * Finds a user by their ID
   * @param id - The user ID to search for
   * @returns The found user or null if not found
   */
  async findById(id: string): Promise<DatabaseUser | null> {
    return this.userRepository.findById(id);
  }
}
