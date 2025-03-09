import { DynamicModule, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Module for providing the LoggerService.
 */
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LoggerService,
          useFactory: (): LoggerService => {
            return new LoggerService();
          },
        },
      ],
      exports: [LoggerService],
    };
  }

  static forFeature(serviceName: string): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LoggerService,
          useFactory: (): LoggerService => {
            return new LoggerService(serviceName);
          },
        },
      ],
      exports: [LoggerService],
    };
  }
}
