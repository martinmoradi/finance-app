import { Display, Body } from '@/components/ui/typography';
import LogoLarge from '@public/logo-large.svg';
import IllustrationAuthentication from '@public/illustration-authentication.svg';

export function AuthIllustration() {
  return (
    <div className='relative'>
      {/* Base illustration */}
      <IllustrationAuthentication className='w-full h-full object-fit rounded-xl' />

      {/* Logo overlay */}
      <div className='absolute top-10 left-10'>
        <LogoLarge className='h-10' />
      </div>

      {/* Text content overlay */}
      <div className='absolute left-10 max-w-[48rem] top-[80%]'>
        <div className='mb-6'>
          <Display>
            <span className='text-white'>
              Keep track of your money <br /> and save for your future
            </span>
          </Display>
        </div>
        <Body>
          <span className='text-white'>
            Personal finance app puts you in control of your spending. Track
            transactions, set budgets, and add to savings pots easily.
          </span>
        </Body>
      </div>
    </div>
  );
}
