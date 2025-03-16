'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/store/useAuth';
import Me from '@/app/me';
import { useRouter } from 'next/navigation';
import { Display } from '@/components/ui/typography';

export default function Overview() {
  const router = useRouter();
  const { signout } = useAuth();

  const handleSignout = async () => {
    const response = await signout();
    if (response.success) {
      router.push('/signin');
    }
  };

  return (
    <>
      <Display>Overview</Display>
      <Me />

      <Button onClick={handleSignout}>Sign out</Button>
    </>
  );
}
