import { Controller, Get } from '@nestjs/common';

/**
 * Main application controller.
 * Handles the root route and returns a greeting message.
 */
@Controller()
export class AppController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
