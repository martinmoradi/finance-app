import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { ButtonHTMLAttributes, forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg transition-colors font-body focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground font-bold hover:bg-gray-500',
        secondary:
          'bg-secondary font-bold text-secondary-foreground hover:bg-white hover:border-gray-500 hover:border-[1.5px]',
        destructive:
          'bg-destructive font-bold text-destructive-foreground hover:bg-[#D46C5E]',
        link: 'bg-transparent text-gray-500 hover:text-primary',
      },
      size: {
        default: 'h-13 px-4 py-2',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Button component
 *
 * @param props - Component props
 * @param props.variant - 'primary' (default), 'secondary', 'destructive', or 'link'
 * @param props.size - 'default' (standard) or 'icon' (square)
 * @param props.asChild - When true, renders children as the clickable element
 *
 * @example
 * // Using asChild with Next.js Link component:
 * import Link from 'next/link'
 *
 * <Button asChild variant="primary">
 *   <Link href="/dashboard">Go to Dashboard</Link>
 * </Button>
 *
 * // This renders a Link component with Button styling
 * // The Link becomes the actual DOM element while inheriting all Button styles
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
