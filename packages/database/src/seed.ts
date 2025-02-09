// Import required dependencies
import { createDatabaseClient } from '@/client';
import { schema } from '@/schema';
import { getRequiredEnvVar } from '@repo/env-validation';
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { seed } from 'drizzle-seed';

/**
 * Main seeding function that populates the database with initial data
 */
export async function main() {
  // Create database connection using test or production connection string
  const { db, pool } = await createDatabaseClient({
    connectionString: process.env.TEST
      ? 'postgresql://postgres:postgres@localhost:5433/finance_app_test'
      : getRequiredEnvVar('DATABASE_URL'),
  });

  try {
    console.log('🧹 Cleaning database...');
    // Truncate all existing tables before seeding
    for (const [tableName] of Object.entries(schema)) {
      await db.execute(
        sql`TRUNCATE TABLE ${sql.identifier(tableName)} CASCADE`,
      );
    }

    console.log('🌱 Starting seeding...');
    // Seed the users table with fake data
    // Uses different count for test (3) vs development (5) environments
    await seed(db, { users: schema.users }).refine((f) => ({
      users: {
        count: process.env.TEST ? 3 : 5,
        columns: {
          name: f.fullName(), // Generate fake full names
          email: f.email(), // Generate fake email addresses
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
