import { BodyStrong, Subtitle } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItemProps {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export function NavigationItem({
  label,
  href,
  icon: Icon,
}: NavigationItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col mt-2 rounded-t-xl items-center min-w-[6.9rem] min-h-[4.4rem] gap-1 ',
        /* Tablets */
        'md:min-w-[10.4rem] md:min-h-[6.6rem]',
        /* Desktop */
        'lg:mt-0 lg:flex-row lg:pl-[3.5rem] lg:py-4 lg:mr-6 lg:rounded-t-none lg:rounded-r-xl lg:gap-4',
        isActive
          ? 'text-primary bg-white  border-b-4 border-green lg:border-b-0 lg:border-l-4 lg:border-l-green'
          : 'text-muted-foreground hover:text-white',
      )}>
      <Icon className={cn('w-5 h-5 mt-2', isActive && 'text-green')} />
      <div className='hidden md:block lg:hidden'>
        <BodyStrong>{label}</BodyStrong>
      </div>
      <div className='hidden lg:block'>
        <Subtitle>{label}</Subtitle>
      </div>
    </Link>
  );
}
