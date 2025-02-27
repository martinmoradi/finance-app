import { TestDatabaseModule } from '@/database/__tests__/test-database.module';
import { TestDatabaseService } from '@/database/__tests__/test-database.service';
import { DatabaseModule } from '@/database/database.module';
import { LoggerModule } from '@/logger/logger.module';
import { DynamicModule, INestApplication, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseConnection, setupTestDatabase } from '@repo/database';

export async function setupTestApp(
  appModule: Type<unknown> | DynamicModule,
  configure?: (app: INestApplication) => Promise<void>,
): Promise<{
  app: INestApplication;
  moduleRef: TestingModule;
  connection: DatabaseConnection;
  testDbService: TestDatabaseService;
}> {
  try {
    // Set test environment flag
    process.env.TEST = 'true';

    // Set database URL based on environment
    if (!process.env.CI) {
      // Local development: use test database
      process.env.DATABASE_URL =
        'postgresql://postgres:postgres@localhost:5433/finance_app_test';
    }

    // Setup test database connection
    const connection = await setupTestDatabase();

    // Create testing module with overrides
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(), appModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    // Get test database service and set connection
    const testDbService =
      moduleRef.get<TestDatabaseService>(TestDatabaseService);
    testDbService.setConnection(connection);

    // Create NestJS application
    const app = moduleRef.createNestApplication();

    // Allow custom configuration
    if (configure) {
      await configure(app);
    }

    await app.init();

    return { app, moduleRef, connection, testDbService };
  } catch (error) {
    console.error('Failed to setup test app:', error);
    throw error;
  }
}
