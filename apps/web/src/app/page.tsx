'use client';

import { signout } from '@/actions/auth/signout';
import { Button } from '@/components/ui/button';
import Me from './me';

export default function Home() {
  return (
    <>
      <div>Home page</div>
      <Me />

      <Button onClick={signout}>Sign out</Button>
    </>
  );
}
