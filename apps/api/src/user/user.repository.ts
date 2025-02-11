import { BaseRepository } from '@/database/base.repository';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { Injectable } from '@nestjs/common';
import { eq, queries, users } from '@repo/database';
import { DatabaseUser } from '@repo/types';

/**
 * Repository for managing user data in the database.
 * Extends BaseRepository to provide database access functionality.
 */
@Injectable()
export class UserRepository extends BaseRepository {
  /**
   * Retrieves all users from the database.
   * @returns Array of users if found, null if no users exist.
   */
  async findAll(): Promise<DatabaseUser[] | null> {
    const users = await this.db.query.users.findMany();
    return users?.length ? users : null;
  }

  /**
   * Finds a user by their ID.
   * @param id - The user's unique identifier.
   * @returns User if found, null if not found.
   */
  async findById(id: string): Promise<DatabaseUser | null> {
    const user = await this.db.query.users.findFirst(queries.byId(id));
    return user ?? null;
  }

  /**
   * Finds a user by their email address.
   * @param email - The user's email address.
   * @returns User if found, null if not found.
   */
  async findByEmail(email: string): Promise<DatabaseUser | null> {
    const user = await this.db.query.users.findFirst(queries.byEmail(email));
    return user ?? null;
  }

  /**
   * Creates a new user in the database.
   * @param createUserDto - Data transfer object containing user creation data.
   * @returns Newly created user if successful, null if creation fails.
   */
  async create(createUserDto: CreateUserDto): Promise<DatabaseUser | null> {
    const newUser = await this.db
      .insert(users)
      .values(createUserDto)
      .returning();
    return newUser[0] ?? null;
  }

  /**
   * Updates a user's refresh token in the database.
   * @param userId - The user's unique identifier.
   * @param hashedRefreshToken - The new hashed refresh token.
   * @returns Updated user if successful, null if update fails.
   */
  async updateRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<DatabaseUser | null> {
    const updatedUser = await this.db
      .update(users)
      .set({ refreshToken: hashedRefreshToken })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser[0] ?? null;
  }
}
