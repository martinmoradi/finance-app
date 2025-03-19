import { cn } from '@/lib/utils';
import {
  createContext,
  forwardRef,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  useContext,
  useId,
} from 'react';

// Create context for input group
interface InputContextValue {
  id: string;
}

const InputContext = createContext<InputContextValue | undefined>(undefined);

// Input Props
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    // Get context if within an InputGroup
    const context = useContext(InputContext);
    // Fix: useId must not be called conditionally
    const generatedId = useId();
    const id = props.id || context?.id || generatedId;

    return (
      <input
        type={type}
        id={id}
        className={cn(
          'flex h-[var(--input-height)] w-full rounded-lg border-[1.5px] bg-transparent px-3 py-1 text-body transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-beige-500 placeholder:text-body focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-500 focus-visible:border-primary',
          // Handle Chrome autofill styling
          '[&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:shadow-[0_0_0_30px_white_inset]',
          // For dark mode (if applicable)
          '[&:-webkit-autofill:focus]:bg-transparent',
          // Keep the error state handling
          error && 'border-red hover:border-red focus-visible:border-red',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

// Input Group Props
interface InputGroupProps {
  children: ReactNode;
  className?: string;
}

// Input Group Component
const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ children, className, ...props }, ref) => {
    const id = useId();

    return (
      <InputContext.Provider value={{ id }}>
        <div
          ref={ref}
          className={cn('relative flex items-center rounded-lg', className)}
          {...props}>
          {children}
        </div>
      </InputContext.Provider>
    );
  },
);
InputGroup.displayName = 'InputGroup';

// Input Prefix Props
interface InputAddonProps {
  children: ReactNode;
  className?: string;
}

// Input Prefix Component
const InputPrefix = forwardRef<HTMLDivElement, InputAddonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-11 items-center rounded-l-lg border-[1.5px] border-r-0 bg-transparent px-3 text-body',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
InputPrefix.displayName = 'InputPrefix';

// Input Suffix Component
const InputSuffix = forwardRef<HTMLDivElement, InputAddonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-11 items-center rounded-r-lg border-[1.5px] border-l-0 bg-transparent px-3 text-body',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
InputSuffix.displayName = 'InputSuffix';

// Input Icon Props
interface InputIconProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

// Left Icon Component
const InputLeftIcon = forwardRef<HTMLDivElement, InputIconProps>(
  (
    { children, className, onClick, 'aria-label': ariaLabel, ...props },
    ref,
  ) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };

    return onClick ? (
      <div
        ref={ref}
        role='button'
        tabIndex={0}
        className={cn(
          'absolute left-3 flex items-center justify-center',
          'cursor-pointer',
          className,
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel || 'Input left icon'}
        {...props}>
        {children}
      </div>
    ) : (
      <div
        ref={ref}
        className={cn(
          'absolute left-3 flex items-center justify-center',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
InputLeftIcon.displayName = 'InputLeftIcon';

// Right Icon Component
const InputRightIcon = forwardRef<HTMLDivElement, InputIconProps>(
  (
    { children, className, onClick, 'aria-label': ariaLabel, ...props },
    ref,
  ) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };

    return onClick ? (
      <div
        ref={ref}
        role='button'
        tabIndex={0}
        className={cn(
          'absolute right-5 flex items-center justify-center',
          'cursor-pointer',
          className,
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel || 'Input right icon'}
        {...props}>
        {children}
      </div>
    ) : (
      <div
        ref={ref}
        className={cn(
          'absolute right-3 flex items-center justify-center',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
InputRightIcon.displayName = 'InputRightIcon';

export {
  Input,
  InputGroup,
  InputLeftIcon,
  InputPrefix,
  InputRightIcon,
  InputSuffix,
};
