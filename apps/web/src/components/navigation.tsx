'use client';

import { NavigationItem } from '@/components/navigation-item';
import { cn } from '@/lib/utils';
import BudgetsIcon from '@public/icon-nav-budgets.svg';
import OverviewIcon from '@public/icon-nav-overview.svg';
import PotsIcon from '@public/icon-nav-pots.svg';
import RecurringBillsIcon from '@public/icon-nav-recurring-bills.svg';
import TransactionsIcon from '@public/icon-nav-transactions.svg';
import LogoLargeIcon from '@public/logo-large.svg';
import LogoSmallIcon from '@public/logo-small.svg';
import { useState } from 'react';

export function Navigation() {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <nav
      className={cn(
        'bg-foreground text-white h-[var(--navigation-mobile)] md:h-[var(--navigation-tablet)] lg:h-full w-full rounded-t-lg lg:rounded-tl-none lg:rounded-br-lg',
        isMinimized
          ? 'lg:w-[var(--navigation-desktop-closed)]'
          : 'lg:w-[var(--navigation-desktop-open)]',
      )}>
      <div className='hidden lg:block py-10 pl-8 mb-6'>
        {isMinimized ? <LogoSmallIcon /> : <LogoLargeIcon />}
      </div>

      <ul className='flex justify-between lg:flex-col mx-10 lg:mx-0'>
        {links.map((link) => (
          <li key={link.label}>
            <NavigationItem key={link.label} {...link} />
          </li>
        ))}
      </ul>

      <div className='hidden lg:block'>
        <button onClick={() => setIsMinimized(!isMinimized)}>
          {isMinimized ? 'Open' : 'Close'}
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
