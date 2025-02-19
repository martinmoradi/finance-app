// test-setup.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { TestDatabaseModule } from '@/database/__tests__/test-database.module';
import { TestDatabaseService } from '@/database/__tests__/test-database.service';
import { setupTestDatabase, DatabaseConnection } from '@repo/database';
import { LoggerModule } from '@/logger/logger.module';

export async function setupTestApp(
  appModule: any,
  configure?: (app: INestApplication) => Promise<void>,
): Promise<{
  app: INestApplication;
  moduleRef: TestingModule;
  connection: DatabaseConnection;
  testDbService: TestDatabaseService;
}> {
  try {
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
