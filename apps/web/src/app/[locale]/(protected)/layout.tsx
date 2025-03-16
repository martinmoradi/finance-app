'use client';

import { Navigation } from '@/components/navigation';
import { useActivityBasedSessionRefresh } from '@/features/auth/hooks/use-activity-based-session-refresh';
import { cn } from '@/lib/utils';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useActivityBasedSessionRefresh();

  return (
    <div
      className={cn(
        'grid min-h-screen',
        /* Mobile & Tablet (default) Navigation at bottom */
        'grid-cols-1 grid-rows-[1fr_auto]',
        /* Desktop Navigation on left side */
        'lg:grid-rows-1 lg:grid-cols-[auto_1fr]',
      )}>
      {/* Navigation - full width at bottom on mobile/tablet, left side on desktop */}
      <div className='row-start-2 lg:row-start-1'>
        <Navigation />
      </div>
      {/* Main content - above navigation on mobile/tablet, beside it on desktop */}
      <main className='row-start-1 lg:col-start-2 mt-8 mx-4 mb-6 md:m-10 md:mb-8'>
        {children}
      </main>
    </div>
  );
}
