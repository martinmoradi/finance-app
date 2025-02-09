import { describe, expect, it } from 'vitest';
import { AppService } from '@/app.service';

describe('AppService', () => {
  const service = new AppService();

  it('should return "Hello World!"', () => {
    expect(service.getHello()).toBe('Hello World!');
  });
});
