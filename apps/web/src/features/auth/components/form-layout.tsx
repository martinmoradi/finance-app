'use client';

import { Button } from '@/components/ui/button';
import { Body, BodyStrong, Display } from '@/components/ui/typography';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/store/useAuth';
import { Loader2 } from 'lucide-react';

export function FormLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');
  const pathname = usePathname();
  const isSignup = pathname === '/signup';
  const { signin, status, clearErrors } = useAuth();
  const router = useRouter();

  const handleSigninTestAccount = async () => {
    clearErrors();

    const response = await signin({
      email: 'test@example.com',
      password: 'Password123!',
    });

    if (response.success) {
      router.push('/');
    }
  };

  return (
    <div className='max-w-[56rem] w-full rounded-xl bg-white px-8 py-8 space-y-8'>
      <Display>{isSignup ? t('signup.title') : t('signin.title')}</Display>

      <div>{children}</div>

      <div className='mb-8'>
        <Button
          className='w-full bg-blue'
          onClick={handleSigninTestAccount}
          disabled={status === 'loading'}
          aria-busy={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader2
                className='mr-2 h-4 w-4 animate-spin'
                aria-hidden='true'
              />
              <span>{t('signin.loadingText')}</span>
              <span className='sr-only'>{t('signin.loadingAction')}</span>
            </>
          ) : (
            `🚀 ${t('shared.testAccountButton')}`
          )}
        </Button>
      </div>

      <div className='flex flex-row items-baseline justify-center gap-4'>
        <Body className='text-base text-muted-foreground'>
          {isSignup ? t('signup.signinPrompt') : t('signin.signupPrompt')}
        </Body>
        <Link href={isSignup ? '/login' : '/signup'} prefetch={true}>
          <BodyStrong>
            <span className='text-base underline underline-offset-4 hover:text-muted-foreground'>
              {isSignup ? t('signup.signinLink') : t('signin.signupLink')}
            </span>
          </BodyStrong>
        </Link>
      </div>
    </div>
  );
}
