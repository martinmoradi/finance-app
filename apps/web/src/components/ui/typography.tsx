import { cn } from '@/lib/utils';
import { HTMLAttributes, ReactNode } from 'react';

// Extend HTMLAttributes to include all possible HTML attributes
interface TypographyProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  as?: React.ElementType; // Optional prop to override the element type
}

/**
 * Display (H1) - Largest text component
 *
 * @description
 * Used for main page headings and hero sections
 */
export function Display({
  children,
  className,
  as,
  ...props
}: TypographyProps) {
  const Component = as || 'h1';
  return (
    <Component className={cn('text-display', className)} {...props}>
      {children}
    </Component>
  );
}

/**
 * Title (H2) - Second-level heading
 *
 * @description
 * Used for section headings and important content divisions
 *
 */
export function Title({ children, className, as, ...props }: TypographyProps) {
  const Component = as || 'h2';
  return (
    <Component className={cn('text-heading', className)} {...props}>
      {children}
    </Component>
  );
}

/**
 * Subtitle (H3) - Third-level heading
 *
 * @description
 * Used for subsections and component headings
 *
 */
export function Subtitle({
  children,
  className,
  as,
  ...props
}: TypographyProps) {
  const Component = as || 'h3';
  return (
    <Component className={cn('text-subheading', className)} {...props}>
      {children}
    </Component>
  );
}

/**
 * Body - Standard paragraph text
 *
 * @description
 * Used for main content text and general paragraphs
 *
 */
export function Body({ children, className, as, ...props }: TypographyProps) {
  const Component = as || 'p';
  return (
    <Component className={cn('text-body', className)} {...props}>
      {children}
    </Component>
  );
}

/**
 * BodyStrong - Emphasized paragraph text
 *
 * @description
 * Used for emphasized content within paragraphs or important notices
 *
 */
export function BodyStrong({
  children,
  className,
  as,
  ...props
}: TypographyProps) {
  const Component = as || 'p';
  return (
    <Component className={cn('text-body-bold', className)} {...props}>
      {children}
    </Component>
  );
}

/**
 * Caption - Small text component
 *
 * @description
 * Used for supplementary information, labels, and metadata
 *
 */
export function Caption({
  children,
  className,
  as,
  ...props
}: TypographyProps) {
  const Component = as || 'p';
  return (
    <Component className={cn('text-caption', className)} {...props}>
      {children}
    </Component>
  );
}

/**
 * CaptionStrong - Emphasized small text
 *
 * @description
 * Used for emphasized small text, labels, and metadata that need highlighting
 *
 */
export function CaptionStrong({
  children,
  className,
  as,
  ...props
}: TypographyProps) {
  const Component = as || 'p';
  return (
    <Component className={cn('text-caption-bold', className)} {...props}>
      {children}
    </Component>
  );
}
