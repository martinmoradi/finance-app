import { LocalAuthGuard } from '@/auth/guards/local-auth/local-auth.guard';

describe('LocalAuthGuard', () => {
  it('should be defined', () => {
    expect(new LocalAuthGuard()).toBeDefined();
  });
});
