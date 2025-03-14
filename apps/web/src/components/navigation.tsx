'use client';

import { BodyStrong, Subtitle } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import MinimizeIcon from '@public/icon-minimize-menu.svg';
import BudgetsIcon from '@public/icon-nav-budgets.svg';
import OverviewIcon from '@public/icon-nav-overview.svg';
import PotsIcon from '@public/icon-nav-pots.svg';
import RecurringBillsIcon from '@public/icon-nav-recurring-bills.svg';
import TransactionsIcon from '@public/icon-nav-transactions.svg';
import LogoLargeIcon from '@public/logo-large.svg';
import LogoSmallIcon from '@public/logo-small.svg';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function Navigation() {
  const [isMinimized, setIsMinimized] = useState(false);
  const pathname = usePathname();

  const checkActive = (href: string) => {
    if (pathname === href) return true;
    // Subpath match, but only if href isn't just '/'
    // This prevents the home route from matching everything
    if (href !== '/' && pathname.startsWith(`${href}/`)) return true;

    return false;
  };
  return (
    <nav
      className={cn(
        'h-[var(--navigation-mobile)] w-full rounded-t-lg bg-foreground text-white',
        'md:h-[var(--navigation-tablet)]',
        'lg:h-full lg:flex lg:flex-col lg:rounded-tl-none lg:rounded-br-lg',
        'lg:transition-all lg:duration-300 lg:ease-in-out',
        isMinimized
          ? 'lg:w-[var(--navigation-desktop-closed)]'
          : 'lg:w-[var(--navigation-desktop-open)]',
      )}
      aria-label='Main navigation'>
      <div className='mb-6 hidden py-10 pl-9 lg:block' aria-hidden='true'>
        {isMinimized ? <LogoSmallIcon /> : <LogoLargeIcon />}
      </div>

      <ul className='mx-10 flex justify-between lg:mx-0 lg:flex-col'>
        {links.map(({ label, href, icon: Icon }) => {
          const isActive = checkActive(href);
          return (
            <li key={label}>
              <Link
                href={href}
                className={cn(
                  'relative mt-2 flex min-h-[4.4rem] min-w-[6.9rem] flex-col items-center gap-1 rounded-t-xl',
                  /** Tablets **/
                  'md:min-h-[6.6rem] md:min-w-[10.4rem]',
                  /** Desktop **/
                  'lg:mt-0 lg:min-w-0 lg:flex-row lg:gap-4 lg:rounded-t-none lg:rounded-r-xl lg:py-4 lg:pl-[3.5rem] lg:pr-6 lg:align-middle',
                  isActive
                    ? 'border-b-4 border-green bg-white text-primary lg:mr-3 lg:border-b-0'
                    : 'text-muted-foreground hover:text-white',
                )}
                aria-current={isActive ? 'page' : undefined}>
                {isActive && (
                  <span
                    className='absolute left-0 top-0 hidden h-full w-1 bg-green lg:block'
                    aria-hidden='true'
                  />
                )}
                <Icon
                  className={cn(
                    'mt-2 h-5 w-5 lg:mt-0',
                    isActive && 'text-green',
                  )}
                />
                <div className='hidden md:block lg:hidden'>
                  <BodyStrong>{label}</BodyStrong>
                </div>
                <div className={cn('hidden', !isMinimized && 'lg:block')}>
                  <Subtitle>{label}</Subtitle>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className='mt-auto mb-[clamp(3rem,calc(7.4/1064*100vh),7.4rem)] hidden h-auto lg:block'>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className={cn(
            'flex w-full flex-row gap-4 rounded-r-xl py-4 pl-[3.5rem] pr-6',
            'text-muted-foreground hover:text-white',
          )}
          aria-label={isMinimized ? 'Expand menu' : 'Minimize menu'}
          aria-expanded={!isMinimized}>
          <MinimizeIcon
            className={cn('h-5 w-5', isMinimized && 'rotate-180')}
            aria-hidden='true'
          />
          <div className={cn('hidden', !isMinimized && 'lg:block')}>
            <Subtitle>Minimize Menu</Subtitle>
          </div>
        </button>
      </div>
    </nav>
  );
}

const links = [
  {
    label: 'Overview',
    href: '/',
    icon: OverviewIcon,
  },
  {
    label: 'Transactions',
    href: '/transactions',
    icon: TransactionsIcon,
  },
  {
    label: 'Budgets',
    href: '/budgets',
    icon: BudgetsIcon,
  },
  {
    label: 'Pots',
    href: '/pots',
    icon: PotsIcon,
  },
  {
    label: 'Recurring bills',
    href: '/recurring-bills',
    icon: RecurringBillsIcon,
  },
];
