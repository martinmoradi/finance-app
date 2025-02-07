import { createDatabaseClient } from '@/client';
import { schema } from '@/schema';
import { getRequiredEnvVar } from '@repo/env-validation';
import 'dotenv/config';
import { seed } from 'drizzle-seed';

async function main() {
  const { db, pool } = await createDatabaseClient({
    connectionString: getRequiredEnvVar('DATABASE_URL'),
  });
  try {
    console.log('🌱 Starting seeding...');
    await seed(db, { users: schema.users }).refine((f) => ({
      users: {
        // Generate 5 users for testing
        count: 5,
        columns: {
          name: f.fullName(),
          email: f.email(),
          // createdAt and updatedAt will be handled by defaultNow()
        },
      },
    }));
    console.log('✅ Seeding completed');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
