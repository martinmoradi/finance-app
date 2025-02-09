import { describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('should return "Hello World!"', () => {
    // Mock implementation
    const mockAppService = {
      getHello: vi.fn().mockReturnValue('Hello World!'),
    };

    const controller = new AppController(
      mockAppService as unknown as AppService,
    );

    expect(controller.getHello()).toBe('Hello World!');
    expect(mockAppService.getHello).toHaveBeenCalledOnce();
  });
});
