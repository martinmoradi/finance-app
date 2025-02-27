import { createDatabaseClient } from '@/client';
import { schema, tables } from '@/schema';
import { getRequiredEnvVar } from '@repo/env-validation';
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { seed } from 'drizzle-seed';

/**
 * Main seeding function that populates the database with initial data
 */
export async function main() {
  // Create database connection using test or production connection strin
  const { db, pool } = await createDatabaseClient({
    connectionString: getRequiredEnvVar('DATABASE_URL'),
  });

  try {
    console.log('🧹 Cleaning database...');
    // Truncate all existing tables before seeding
    for (const [tableName] of Object.entries(tables)) {
      await db.execute(
        sql`TRUNCATE TABLE ${sql.identifier(tableName)} CASCADE`,
      );
    }

    console.log('🌱 Starting seeding...');
    await seed(db, schema).refine((f) => ({
      users: {
        count: process.env.TEST ? 3 : 5,
        columns: {
          name: f.fullName(), // Generate fake full names
          email: f.email(), // Generate fake email addresses
          password: f.string(), // Generate fake passwords
        },
        // Generate 1-3 sessions per user
        with: {
          sessions: [
            { weight: 0.7, count: [1, 2] }, // 70% chance of having 1-2 sessions
            { weight: 0.3, count: [3] }, // 30% chance of having 3 sessions
          ],
        },
      },
      sessions: {
        columns: {
          deviceId: f.uuid(), // Generate unique device IDs
          token: f.string(),
          expiresAt: f.date({
            minDate: new Date(),
            maxDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Up to 30 days in the future
          }),
        },
      },
    }));
    console.log('✅ Seeding completed');
  } catch (error) {
    // Log and re-throw any errors that occur during seeding
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    // Always close the database connection pool when done
    await pool.end();
  }
}

// Execute main function only if this file is run directly (not imported)
if (require.main === module) {
  main();
}
