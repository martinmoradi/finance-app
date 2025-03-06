'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/store/useAuthStore';
import Me from './me';
import { useRouter } from 'next/navigation';

export default function Home() {
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
      <div>Home page</div>
      <Me />

      <Button onClick={handleSignout}>Sign out</Button>
    </>
  );
}
