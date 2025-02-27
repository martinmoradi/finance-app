import { createDatabaseClient } from '@/client';
import { tables } from '@/schema';
import { getRequiredEnvVar } from '@repo/env-validation';
import 'dotenv/config';
import { sql } from 'drizzle-orm';

/**
 * Main function that cleans all tables in the database
 */
export async function clean() {
  // Create database connection
  const { db, pool } = await createDatabaseClient({
    connectionString: getRequiredEnvVar('DATABASE_URL'),
  });

  try {
    console.log('🧹 Starting database cleaning...');

    // Start a transaction for atomicity
    await db.transaction(async (tx) => {
      // Truncate all existing tables
      for (const [tableName] of Object.entries(tables)) {
        console.log(`  • Cleaning table: ${tableName}`);
        await tx.execute(
          sql`TRUNCATE TABLE ${sql.identifier(tableName)} CASCADE`,
        );
      }
    });

    console.log('✅ Database cleaning completed successfully');
  } catch (error) {
    // Log and re-throw any errors that occur during cleaning
    console.error('❌ Database cleaning failed:', error);
    throw error;
  } finally {
    // Always close the database connection pool when done
    await pool.end();
  }
}

// Execute clean function only if this file is run directly (not imported)
if (require.main === module) {
  clean();
}
