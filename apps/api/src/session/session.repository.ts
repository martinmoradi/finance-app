import { BaseRepository } from '@/database/base.repository';
import { Injectable } from '@nestjs/common';
import { and, eq, lt, sessions, SQL } from '@repo/database';
import { DatabaseSession } from '@repo/types';
import { CreateSession } from '@repo/validation';

/**
 * Repository handling database operations for user sessions.
 * Extends BaseRepository to utilize common database functionality.
 */
@Injectable()
export class SessionRepository extends BaseRepository {
  /**
   * Creates a new session in the database.
   *
   * @param newSession - Session data to be created
   * @returns Promise containing the created session or null if creation fails
   */
  async create(newSession: CreateSession): Promise<DatabaseSession | null> {
    const [session] = await this.db
      .insert(sessions)
      .values(newSession)
      .returning();
    return session ?? null;
  }

  /**
   * Finds an session for a specific user and device.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device's unique identifier
   * @returns Promise containing the found session or null if not found
   */
  async findOne(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    const session = await this.db.query.sessions.findFirst({
      where: this.getSessionWhereClause(userId, deviceId),
    });
    return session ?? null;
  }

  /**
   * Retrieves all sessions for a specific user.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing array of sessions
   */
  async findAllByUserId(userId: string): Promise<DatabaseSession[]> {
    const userSessions = await this.db.query.sessions.findMany({
      where: eq(sessions.userId, userId),
    });
    return userSessions;
  }

  /**
   * Updates the lastUsedAt timestamp for a specific session.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device's unique identifier
   * @returns Promise containing the updated session or null if update fails
   */
  async updateLastUsedAt(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    const [updatedSession] = await this.db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(this.getSessionWhereClause(userId, deviceId))
      .returning();
    return updatedSession ?? null;
  }

  /**
   * Deletes a specific session for a user and device combination.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device's unique identifier
   * @returns Promise containing the deleted session or null if deletion fails
   */
  async delete(
    userId: string,
    deviceId: string,
  ): Promise<DatabaseSession | null> {
    const [deletedSession] = await this.db
      .delete(sessions)
      .where(this.getSessionWhereClause(userId, deviceId))
      .returning();

    return deletedSession ?? null;
  }

  /**
   * Deletes all sessions for a specific user.
   *
   * @param userId - User's unique identifier
   * @returns Promise containing array of deleted sessions
   */
  async deleteAllForUser(userId: string): Promise<DatabaseSession[]> {
    const deletedSessions = await this.db
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning();
    return deletedSessions;
  }

  /**
   * Deletes all expired sessions from the database.
   *
   * @returns Promise containing array of deleted expired sessions
   */
  async deleteExpired(): Promise<DatabaseSession[]> {
    const deletedSessions = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning();

    return deletedSessions;
  }

  /**
   * Generates a WHERE clause for querying sessions by user and device IDs.
   *
   * @param userId - User's unique identifier
   * @param deviceId - Device's unique identifier
   * @returns SQL clause for filtering sessions
   */
  private getSessionWhereClause(
    userId: string,
    deviceId: string,
  ): SQL<unknown> | undefined {
    return and(eq(sessions.userId, userId), eq(sessions.deviceId, deviceId));
  }
}
