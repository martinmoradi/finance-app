import { FormLayout } from '@/features/auth/components/form-layout';
import { Illustration } from '@/features/auth/components/illustration';
import LogoLarge from '@public/logo-large.svg';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen w-full mx-auto max-w-[144rem] flex flex-col'>
      {/** Mobile/Tablet top bar - hidden on desktop **/}
      <div className='h-16 w-full bg-foreground flex items-center justify-center lg:hidden'>
        <LogoLarge className='h-7 mt-2' />
      </div>

      {/** Main content area **/}
      <main className='flex-grow flex flex-col lg:flex-row'>
        {/** Left side illustration - hidden on mobile/tablet **/}
        <div className='hidden lg:flex lg:items-center lg:justify-center p-5'>
          <Illustration />
        </div>

        {/** Form - centered **/}
        <div className='flex-grow flex items-center justify-center px-5 py-10'>
          <FormLayout>{children}</FormLayout>
        </div>
      </main>
    </div>
  );
}
