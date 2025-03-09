import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function Display({ children, className }: TypographyProps) {
  return (
    <h1 className={cn('text-display text-grey-900', className)}>{children}</h1>
  );
}

export function Heading({ children, className }: TypographyProps) {
  return (
    <h2 className={cn('text-heading text-grey-900', className)}>{children}</h2>
  );
}

export function Subheading({ children, className }: TypographyProps) {
  return (
    <h3 className={cn('text-subheading text-grey-900', className)}>
      {children}
    </h3>
  );
}

export function Body({ children, className }: TypographyProps) {
  return <p className={cn('text-body text-grey-900', className)}>{children}</p>;
}

export function BodyBold({ children, className }: TypographyProps) {
  return (
    <p className={cn('text-body-bold text-grey-900', className)}>{children}</p>
  );
}

export function Caption({ children, className }: TypographyProps) {
  return (
    <p className={cn('text-caption text-grey-900', className)}>{children}</p>
  );
}

export function CaptionBold({ children, className }: TypographyProps) {
  return (
    <p className={cn('text-caption-bold text-grey-900', className)}>
      {children}
    </p>
  );
}
