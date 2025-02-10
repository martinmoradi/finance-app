import { AppService } from '@/app.service';
import { Controller, Get } from '@nestjs/common';

/**
 * Main application controller
 * Handles the root route and returns a greeting message
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
