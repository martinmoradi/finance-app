import { Body, Display } from '@/components/ui/typography';
import IllustrationAuthentication from '@public/illustration-authentication.svg';
import PecuniaLarge from '@public/pecunia-large.svg';
import { useTranslations } from 'next-intl';

export function Illustration() {
  const t = useTranslations('auth.illustration');

  return (
    <div className='relative'>
      {/* Base illustration */}
      <IllustrationAuthentication className='w-full h-full object-fit rounded-xl' />

      {/* Logo overlay */}
      <div className='absolute top-10 left-10'>
        <PecuniaLarge className='h-10' />
      </div>

      {/* Text content overlay */}
      <div className='absolute left-10 max-w-[48rem] top-[80%]'>
        <div className='mb-6'>
          <Display>
            <span className='text-white'>{t('headline')}</span>
          </Display>
        </div>
        <Body>
          <span className='text-white'>{t('description')}</span>
        </Body>
      </div>
    </div>
  );
}
