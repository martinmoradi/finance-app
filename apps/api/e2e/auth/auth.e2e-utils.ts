import { AppModule } from '@/app.module';
import { TestDatabaseService } from '@/database/__tests__/test-database.service';
import { SessionService } from '@/session/session.service';
import { UserService } from '@/user/user.service';
import { setupTestApp } from '@/utils/test-setup';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import {
  DatabaseConnection,
  rollbackTransaction,
  startTransaction,
} from '@repo/database';
import cookieParser from 'cookie-parser';

export interface TestContext {
  app: INestApplication;
  moduleRef: TestingModule;
  connection: DatabaseConnection;
  testDbService: TestDatabaseService;
  userService: UserService;
  throttlerStorage: ThrottlerStorage;
  sessionService: SessionService;
}

export const setupAuthTests = () => {
  // These variables will be accessible in test files
  let app: INestApplication;
  let moduleRef: TestingModule;
  let connection: DatabaseConnection;
  let testDbService: TestDatabaseService;
  let userService: UserService;
  let throttlerStorage: ThrottlerStorage;
  let sessionService: SessionService;

  beforeEach(async () => {
    // Use the setupTestApp utility with cookie-parser middleware
    const testApp = await setupTestApp(AppModule, async (setupApp) => {
      setupApp.use(cookieParser());
    });

    // Assign to the outer variables so tests can access them
    app = testApp.app;
    moduleRef = testApp.moduleRef;
    connection = testApp.connection;
    testDbService = testApp.testDbService;
    userService = moduleRef.get(UserService);
    throttlerStorage = moduleRef.get(ThrottlerStorage);
    sessionService = moduleRef.get(SessionService);
    // Start transaction for test isolation
    await startTransaction(connection.pool);

    // Reset the throttler storage
    if (throttlerStorage) {
      // Get the internal storage map
      const storage = (throttlerStorage as any).storage;

      // Clear the map instead of replacing it
      if (storage && typeof storage.clear === 'function') {
        storage.clear();
      }
    }
  });

  afterEach(async () => {
    // Rollback transaction after each test
    await rollbackTransaction(connection.pool);
    await app.close();
  });

  // Return the variables for use in tests
  return {
    getApp: () => app,
    getModuleRef: () => moduleRef,
    getConnection: () => connection,
    getTestDbService: () => testDbService,
    getUserService: () => userService,
    getThrottlerStorage: () => throttlerStorage,
    getSessionService: () => sessionService,
  };
};
