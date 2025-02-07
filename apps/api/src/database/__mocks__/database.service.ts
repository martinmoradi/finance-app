import type { DatabaseClient } from '@repo/database';

export class DatabaseService {
  protected get db(): DatabaseClient {
    return {
      query: {
        users: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    } as unknown as DatabaseClient;
  }

  // Since these are mocks and we don't actually need async behavior,
  // we can make them sync functions
  onModuleInit(): void {
    return;
  }

  onModuleDestroy(): void {
    return;
  }
}
