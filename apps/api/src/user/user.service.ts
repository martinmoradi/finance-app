import { LoggerService } from '@/logger/logger.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import {
  UserNotFoundException,
  UserRepositoryException,
  UserRepositoryOperation,
} from '@/user/exceptions';
import { UserRepository } from '@/user/user.repository';
import { Injectable } from '@nestjs/common';
import { DatabaseUser } from '@repo/types';

/**
 * Manages user data operations and repository interactions.
 *
 * All methods log unexpected errors and wrap known errors in appropriate exceptions.
 * Database operations are wrapped in UserRepositoryException.
 */
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Finds user by email.
   *
   * Logs error if database operation fails.
   * @throws {UserRepositoryException}
   */
  async findByEmail(email: string): Promise<DatabaseUser | null> {
    this.logger.debug('Starting database user find by email', {
      email,
      action: 'findByEmail',
    });
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      this.logger.error('Database error during user find', error, {
        email,
        action: 'findByEmail',
      });
      throw new UserRepositoryException(
        UserRepositoryOperation.FIND,
        email,
        error as Error,
      );
    }
  }

  /**
   * Finds user by email or throws not found exception.
   *
   * Logs warning if user not found.
   *
   * Logs error if database operation fails.
   * @throws {UserNotFoundException}
   * @throws {UserRepositoryException}
   */
  async findByEmailOrThrow(email: string): Promise<DatabaseUser> {
    this.logger.debug('Starting database user find by email', {
      email,
      action: 'findByEmailOrThrow',
    });
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        throw new UserNotFoundException();
      }
      return user;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.warn('User not found by email', {
          email,
          action: 'findByEmailOrThrow',
        });
        throw error;
      }
      this.logger.error('Database error during user find', error, {
        email,
        action: 'findByEmailOrThrow',
      });
      throw new UserRepositoryException(
        UserRepositoryOperation.FIND,
        email,
        error as Error,
      );
    }
  }

  /**
   * Finds user by ID.
   *
   * Logs error if database operation fails.
   * @throws {UserRepositoryException}
   */
  async findById(id: string): Promise<DatabaseUser | null> {
    this.logger.debug('Starting database user find by ID', {
      userId: id,
      action: 'findById',
    });
    try {
      return await this.userRepository.findById(id);
    } catch (error) {
      this.logger.error('Database error during user find', error, {
        userId: id,
        action: 'findById',
      });
      throw new UserRepositoryException(
        UserRepositoryOperation.FIND,
        id,
        error as Error,
      );
    }
  }

  /**
   * Finds user by ID or throws not found exception.
   *
   * Logs warning if user not found.
   *
   * Logs error if database operation fails.
   * @throws {UserNotFoundException}
   * @throws {UserRepositoryException}
   */
  async findByIdOrThrow(id: string): Promise<DatabaseUser> {
    this.logger.debug('Starting database user find by ID', {
      userId: id,
      action: 'findByIdOrThrow',
    });
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundException();
      }
      return user;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.warn('User not found by ID', {
          userId: id,
          action: 'findByIdOrThrow',
        });
        throw error;
      }
      this.logger.error('Database error during user find', error, {
        userId: id,
        action: 'findByIdOrThrow',
      });
      throw new UserRepositoryException(
        UserRepositoryOperation.FIND,
        id,
        error as Error,
      );
    }
  }

  /**
   * Creates new user record.
   *
   * Logs error if database operation fails.
   * @throws {UserRepositoryException}
   */
  async create(createUserDto: CreateUserDto): Promise<DatabaseUser> {
    this.logger.debug('Starting database user creation', {
      email: createUserDto.email,
      action: 'create',
    });
    try {
      const user = await this.userRepository.create(createUserDto);
      if (!user) {
        throw new UserRepositoryException(
          UserRepositoryOperation.CREATE,
          createUserDto.email,
        );
      }
      return user;
    } catch (error) {
      if (error instanceof UserRepositoryException) {
        throw error;
      }
      this.logger.error('Database error during user creation', error, {
        email: createUserDto.email,
        action: 'create',
      });
      throw new UserRepositoryException(
        UserRepositoryOperation.CREATE,
        createUserDto.email,
        error as Error,
      );
    }
  }

  /**
   * Deletes user by ID.
   *
   * Logs error if database operation fails.
   * @throws {UserRepositoryException}
   */
  async delete(id: string): Promise<void> {
    this.logger.debug('Starting database user deletion', {
      userId: id,
      action: 'delete',
    });
    try {
      await this.userRepository.delete(id);
    } catch (error) {
      this.logger.error('Database error during user deletion', error, {
        userId: id,
        action: 'delete',
      });
      throw new UserRepositoryException(
        UserRepositoryOperation.DELETE,
        id,
        error as Error,
      );
    }
  }
}
