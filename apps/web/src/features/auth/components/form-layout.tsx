'use client';

import { Body, BodyStrong, Display } from '@/components/ui/typography';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function FormLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');
  const pathname = usePathname();
  const isSignup = pathname === '/signup';

  return (
    <div className='max-w-[56rem] w-full rounded-xl bg-white px-8 py-8 space-y-8'>
      <Display>{isSignup ? t('signup.title') : t('signin.title')}</Display>

      <div className='mb-8'>{children}</div>

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
