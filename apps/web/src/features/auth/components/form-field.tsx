import React, { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Caption, CaptionStrong } from '@/components/ui/typography';
import { useTranslations } from 'next-intl';

export interface TypedFieldApi<TValue = unknown> {
  name: string;
  state: {
    value: TValue;
    meta: {
      // Unknown[] to match TanStack Form's flexible error structure
      errors?: unknown[] | null;
      isTouched: boolean;
    };
  };
  handleChange: (value: TValue) => void;
  handleBlur: () => void;
}

interface FormFieldProps<TValue = unknown> {
  field: TypedFieldApi<TValue>;
  label: string;
  helpText?: ReactNode;
  children: ReactNode;
  required?: boolean;
}

/**
 * Base form field component providing consistent layout and error handling
 */
export function FormField<TValue = unknown>({
  field,
  label,
  helpText,
  children,
  required = false,
}: FormFieldProps<TValue>) {
  const t = useTranslations('auth');

  // Check if we have errors and the field has been touched
  const hasErrors =
    Array.isArray(field.state.meta.errors) &&
    field.state.meta.errors.length > 0 &&
    field.state.meta.isTouched;

  // Get error message safely from the first error
  const getErrorMessage = () => {
    if (!hasErrors || !field.state.meta.errors?.[0]) return null;

    const error = field.state.meta.errors[0];

    // Handle string error
    if (typeof error === 'string') return error;

    // Handle object with message property
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    // Fallback: try to convert to string
    return String(error);
  };

  const errorMessage = getErrorMessage();

  return (
    <div className='mb-4'>
      <Label htmlFor={field.name}>
        <CaptionStrong>
          {label}
          {required && (
            <span aria-hidden='true' className='text-red ml-1'>
              *
            </span>
          )}
        </CaptionStrong>
      </Label>

      {children}

      <div className='h-2 pt-1 text-right'>
        {hasErrors && errorMessage ? (
          <Caption id={`${field.name}-error`}>
            <span className='text-red'>{t(errorMessage)}</span>
          </Caption>
        ) : helpText ? (
          <Caption id={`${field.name}-help`}>
            <span className='text-muted-foreground'>{helpText}</span>
          </Caption>
        ) : null}
      </div>
    </div>
  );
}
