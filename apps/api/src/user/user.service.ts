import { LoggerService } from '@/logger/logger.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  UserNotFoundException,
  UserRepositoryException,
} from '@/user/exceptions';
import { UserRepository } from '@/user/user.repository';
import { Injectable } from '@nestjs/common';
import { DatabaseUser } from '@repo/types';

/**
 * Manages user data operations and repository interactions
 */
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Finds user by email
   * @throws {UserRepositoryException} If database operation fails
   */
  async findByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      this.logger.error('Error finding user by email', error);
      throw new UserRepositoryException('find', email, error as Error);
    }
  }

  /**
   * Finds user by ID
   * @throws {UserRepositoryException} If database operation fails
   */
  async findById(id: string): Promise<DatabaseUser | null> {
    try {
      return await this.userRepository.findById(id);
    } catch (error) {
      this.logger.error('Error finding user by ID', error);
      throw new UserRepositoryException('find', id, error as Error);
    }
  }

  /**
   * Finds user by ID or throws not found exception
   * @throws {UserNotFoundException} If user doesn't exist
   * @throws {UserRepositoryException} If database operation fails
   */
  async findByIdOrThrow(id: string): Promise<DatabaseUser> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundException();
      }
      return user;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }
      this.logger.error('Error finding user by ID', error);
      throw new UserRepositoryException('find', id, error as Error);
    }
  }

  /**
   * Creates new user record
   * @throws {UserRepositoryException} If creation fails
   */
  async create(createUserDto: CreateUserDto): Promise<DatabaseUser> {
    try {
      const user = await this.userRepository.create(createUserDto);
      if (!user) {
        this.logger.warn('Database operation succeeded but returned null', {
          userEmail: createUserDto.email,
        });
        throw new UserRepositoryException('create', createUserDto.email);
      }
      return user;
    } catch (error) {
      this.logger.error('Error creating user', error);
      throw new UserRepositoryException(
        'create',
        createUserDto.email,
        error as Error,
      );
    }
  }

  /**
   * Deletes user by ID
   * @throws {UserRepositoryException} If deletion fails
   */
  async delete(id: string): Promise<void> {
    try {
      return await this.userRepository.delete(id);
    } catch (error) {
      this.logger.error('Error deleting user by ID', error);
      throw new UserRepositoryException('delete', id, error as Error);
    }
  }
}
