'use client';

import { Input, InputGroup, InputRightIcon } from '@/components/ui/input';
import {
  FormField,
  TypedFieldApi,
} from '@/features/auth/components/form-field';
import HidePasswordIcon from '@public/icon-hide-password.svg';
import ShowPasswordIcon from '@public/icon-show-password.svg';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';

interface PasswordFieldProps {
  field: TypedFieldApi<string>;
  label: string;
  placeholder?: string;
  helpText?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  showRequirements?: boolean;
  autoComplete?: 'current-password' | 'new-password';
}

/**
 * Password field component with show/hide functionality
 */
export function PasswordField({
  field,
  label,
  placeholder,
  helpText,
  disabled,
  required,
  showRequirements,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations('auth');

  // Check if we have errors and the field has been touched
  const hasErrors =
    Array.isArray(field.state.meta.errors) &&
    field.state.meta.errors.length > 0 &&
    field.state.meta.isTouched;

  return (
    <FormField
      field={field}
      label={label}
      helpText={!hasErrors && showRequirements ? helpText : undefined}
      required={required}>
      <InputGroup>
        <Input
          id={field.name}
          name={field.name}
          type={isVisible ? 'text' : 'password'}
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
        <InputRightIcon
          onClick={() => setIsVisible(!isVisible)}
          aria-label={
            isVisible ? t('shared.hidePassword') : t('shared.showPassword')
          }
          className='cursor-pointer'>
          {isVisible ? <HidePasswordIcon /> : <ShowPasswordIcon />}
        </InputRightIcon>
      </InputGroup>
    </FormField>
  );
}
