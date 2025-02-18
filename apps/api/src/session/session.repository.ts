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
   */
  async create(newSession: CreateSession): Promise<DatabaseSession | null> {
    const [session] = await this.db
      .insert(sessions)
      .values(newSession)
      .returning();
    return session ?? null;
  }

  /**
   * Retrieves a session for a specific user and device combination.
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
   */
  async findAllByUserId(userId: string): Promise<DatabaseSession[]> {
    const userSessions = await this.db.query.sessions.findMany({
      where: eq(sessions.userId, userId),
    });
    return userSessions;
  }

  /**
   * Updates the lastUsedAt timestamp for a specific session.
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
   */
  async deleteAllForUser(userId: string): Promise<DatabaseSession[]> {
    const deletedSessions = await this.db
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning();
    return deletedSessions;
  }

  /**
   * Deletes all sessions that have passed their expiration date.
   */
  async deleteExpired(): Promise<DatabaseSession[]> {
    const deletedSessions = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning();

    return deletedSessions;
  }

  /**
   * Helper method to generate a WHERE clause for session queries.
   */
  private getSessionWhereClause(
    userId: string,
    deviceId: string,
  ): SQL<unknown> | undefined {
    return and(eq(sessions.userId, userId), eq(sessions.deviceId, deviceId));
  }
}
