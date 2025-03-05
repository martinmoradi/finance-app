'use server';

import { PublicUser } from '@repo/types';
import { cookies } from 'next/headers';

export async function getSession(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return null;
  }

  return JSON.parse(session.value);
}
