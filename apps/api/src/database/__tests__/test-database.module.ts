import { Module } from '@nestjs/common';
import { TestDatabaseService } from './test-database.service';
import { LoggerModule } from '@/logger/logger.module';

@Module({
  imports: [LoggerModule.forFeature('TestDatabaseService')],
  providers: [
    TestDatabaseService,
    {
      provide: 'DatabaseService',
      useClass: TestDatabaseService,
    },
  ],
  exports: ['DatabaseService', TestDatabaseService],
})
export class TestDatabaseModule {}
