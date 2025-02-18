import { AppService } from '@/app.service';
import { describe, expect, it } from 'vitest';

describe('AppService', () => {
  const service = new AppService();

  it('should return "Hello World!"', () => {
    expect(service.getHello()).toBe('Hello World!');
  });
});
