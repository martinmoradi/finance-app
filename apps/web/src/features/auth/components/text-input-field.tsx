import { Input } from '@/components/ui/input';
import {
  FormField,
  TypedFieldApi,
} from '@/features/auth/components/form-field';
import { ReactNode } from 'react';

interface TextInputFieldProps {
  field: TypedFieldApi<string>;
  label: string;
  placeholder?: string;
  helpText?: ReactNode;
  type?: 'text' | 'email' | 'tel' | 'url';
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

/**
 * Text input field component with consistent styling and behavior
 */
export function TextInputField({
  field,
  label,
  placeholder,
  helpText,
  type = 'text',
  disabled,
  required,
  autoComplete,
}: TextInputFieldProps) {
  const hasErrors =
    Array.isArray(field.state.meta.errors) &&
    field.state.meta.errors.length > 0 &&
    field.state.meta.isTouched;

  return (
    <FormField
      field={field}
      label={label}
      helpText={helpText}
      required={required}>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value ?? ''}
        placeholder={placeholder}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        error={hasErrors}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={hasErrors}
        aria-describedby={
          hasErrors
            ? `${field.name}-error`
            : helpText
              ? `${field.name}-help`
              : undefined
        }
      />
    </FormField>
  );
}
