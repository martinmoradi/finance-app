import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

/**
 * Display (H1) - Largest text component
 *
 * @description
 * Used for main page headings and hero sections
 */
export function Display({ children, className }: TypographyProps) {
  return <h1 className={cn('text-display', className)}>{children}</h1>;
}

/**
 * Title (H2) - Second-level heading
 *
 * @description
 * Used for section headings and important content divisions
 *
 */
export function Title({ children, className }: TypographyProps) {
  return <h2 className={cn('text-heading', className)}>{children}</h2>;
}

/**
 * Subtitle (H3) - Third-level heading
 *
 * @description
 * Used for subsections and component headings
 *
 */
export function Subtitle({ children, className }: TypographyProps) {
  return <h3 className={cn('text-subheading', className)}>{children}</h3>;
}

/**
 * Body - Standard paragraph text
 *
 * @description
 * Used for main content text and general paragraphs
 *
 */
export function Body({ children, className }: TypographyProps) {
  return <p className={cn('text-body', className)}>{children}</p>;
}

/**
 * BodyStrong - Emphasized paragraph text
 *
 * @description
 * Used for emphasized content within paragraphs or important notices
 *
 */
export function BodyStrong({ children, className }: TypographyProps) {
  return <p className={cn('text-body-bold', className)}>{children}</p>;
}

/**
 * Caption - Small text component
 *
 * @description
 * Used for supplementary information, labels, and metadata
 *
 */
export function Caption({ children, className }: TypographyProps) {
  return <p className={cn('text-caption', className)}>{children}</p>;
}

/**
 * CaptionStrong - Emphasized small text
 *
 * @description
 * Used for emphasized small text, labels, and metadata that need highlighting
 *
 */
export function CaptionStrong({ children, className }: TypographyProps) {
  return <p className={cn('text-caption-bold', className)}>{children}</p>;
}
