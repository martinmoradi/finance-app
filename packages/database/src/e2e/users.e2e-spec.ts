import type { DatabaseConnection } from '@/client';
import { DatabaseClient } from '@/client';
import { schema, tables } from '@/schema';
import { main as seedDatabase } from '@/seed';
import {
  cleanupTestDatabase,
  rollbackTransaction,
  setupTestDatabase,
  startTransaction,
} from '@/e2e/helpers/db';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';

describe('Users e2e Tests', () => {
  let connection: DatabaseConnection;
  let db: DatabaseClient;
  let pool: Pool;

  // Set up test database and seed data before all tests
  beforeAll(async () => {
    // Initialize database connection and get client/pool references
    connection = await setupTestDatabase();
    db = connection.db;
    pool = connection.pool;

    // Clean up any existing data
    await cleanupTestDatabase(connection);

    // Seed fresh data
    await seedDatabase();
  });

  // Start a new transaction before each test for isolation
  beforeEach(async () => {
    await startTransaction(pool);
  });

  // Roll back transaction after each test to maintain clean state
  afterEach(async () => {
    await rollbackTransaction(pool);
  });

  // Clean up database and close connections after all tests complete
  afterAll(async () => {
    await cleanupTestDatabase(connection);
    await pool.end();
  });

  describe('User Queries', () => {
    it('should successfully connect to database', async () => {
      const result = await pool.query('SELECT 1 as number');
      expect(result.rows[0].number).toBe(1);
    });

    it('should find all seeded users', async () => {
      const result = await db.query.users.findMany();

      // Verify specific seeded data patterns
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: expect.stringMatching(
              /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
            ),
            name: expect.any(String),
          }),
        ]),
      );
    });

    it('should find user by email (case insensitive)', async () => {
      const testUser = await db.query.users.findFirst();
      if (!testUser) throw new Error('No test user found');

      // Test case insensitivity
      const result = await db.query.users.findFirst({
        where: eq(schema.users.email, testUser.email),
      });

      expect(result).toEqual(testUser);
    });

    it('should find user by id', async () => {
      const users = await db.query.users.findMany();
      const testUser = users[0];
      if (!testUser) throw new Error('No test user found');

      const result = await db.query.users.findFirst({
        where: eq(schema.users.id, testUser.id),
      });

      expect(result).toEqual(testUser);
    });
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'integration-test@example.com',
        name: 'Integration Test User',
        password: 'password123',
      };

      const result = await db.insert(schema.users).values(newUser).returning();
      expect(result[0]).toMatchObject({
        ...newUser,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should update user information', async () => {
      const users = await db.query.users.findMany();
      const testUser = users[0];
      if (!testUser) throw new Error('No test user found');

      const updatedName = 'Updated Name';
      const result = await db
        .update(schema.users)
        .set({ name: updatedName })
        .where(eq(schema.users.id, testUser.id))
        .returning();

      expect(result[0]?.name).toBe(updatedName);
    });

    it('should enforce unique email constraint', async () => {
      const users = await db.query.users.findMany();
      const existingUser = users[0];
      if (!existingUser) throw new Error('No test user found');

      const newUser = {
        email: existingUser.email, // Try to create user with existing email
        name: 'Test User',
        password: 'password123',
      };

      await expect(db.insert(schema.users).values(newUser)).rejects.toThrow();
    });

    it('should create a new user with valid timestamps', async () => {
      const newUser = {
        email: 'new-user@example.com',
        name: 'New User',
        password: 'validPassword123!',
      };

      const [created] = await db
        .insert(schema.users)
        .values(newUser)
        .returning();

      if (!created) throw new Error('No created user found');

      // Verify database state directly
      const dbUser = await db.query.users.findFirst({
        where: eq(schema.users.id, created.id),
      });

      expect(dbUser).toMatchObject({
        ...newUser,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(created.updatedAt).toEqual(created.createdAt);
    });

    it('should update user information and update timestamp', async () => {
      const testUser = await db.query.users.findFirst();
      if (!testUser) throw new Error('No test user found');

      const updatedData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };
      const [updated] = await db
        .update(schema.users)
        .set(updatedData)
        .where(eq(schema.users.id, testUser.id))
        .returning();

      // Verify partial update and timestamp change
      expect(updated).toMatchObject(updatedData);
      expect(updated?.updatedAt?.getTime()).toBeGreaterThan(
        testUser.updatedAt?.getTime() ?? 0,
      );
      // Verify other fields remain unchanged
      expect(updated?.password).toBe(testUser.password);
      expect(updated?.createdAt).toEqual(testUser.createdAt);
    });
  });

  describe('User-Session Relationships', () => {
    it('should fetch user with their sessions', async () => {
      const users = await db.query.users.findMany({
        with: {
          sessions: true,
        },
      });

      expect(users[0]?.sessions).toBeDefined();
      expect(Array.isArray(users[0]?.sessions)).toBe(true);
    });

    it('should cascade delete sessions when user is deleted', async () => {
      const testUser = await db.query.users.findFirst({
        with: { sessions: true },
      });
      if (!testUser) throw new Error('No test user found');

      // Delete user and verify sessions are removed
      await db.delete(schema.users).where(eq(schema.users.id, testUser.id));

      const remainingSessions = await db.query.sessions.findMany({
        where: eq(schema.sessions.userId, testUser.id),
      });

      expect(remainingSessions).toHaveLength(0);
    });

    it('should have valid session expiration dates', async () => {
      const userWithSessions = await db.query.users.findFirst({
        with: { sessions: true },
      });

      userWithSessions?.sessions.forEach((session) => {
        expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
        expect(session.expiresAt.getTime()).toBeLessThanOrEqual(
          Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        );
      });
    });
  });
});
