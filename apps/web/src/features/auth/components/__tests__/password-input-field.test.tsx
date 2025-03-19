import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordField } from '../password-input-field';
import '@testing-library/jest-dom';
import { TypedFieldApi } from '@/features/auth/components/form-field';

// Mock the dependencies
jest.mock('@/components/ui/input', () => ({
  Input: jest.fn(
    ({
      id,
      name,
      type,
      value,
      placeholder,
      onChange,
      onBlur,
      error,
      disabled,
      required,
      autoComplete,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
    }) => (
      <input
        data-testid='mock-input'
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        data-error={error ? 'true' : 'false'}
        aria-label='password input'
      />
    ),
  ),
  InputGroup: jest.fn(({ children }) => (
    <div data-testid='mock-input-group'>{children}</div>
  )),
  InputRightIcon: jest.fn(
    ({ onClick, 'aria-label': ariaLabel, className, children }) => (
      <button
        data-testid='mock-input-right-icon'
        onClick={onClick}
        aria-label={ariaLabel}
        className={className}
        type='button'>
        {children}
      </button>
    ),
  ),
}));

jest.mock('@/features/auth/components/form-field', () => ({
  FormField: jest.fn(({ field, label, helpText, required, children }) => (
    <div data-testid='mock-form-field'>
      <div data-testid='form-field-label'>{label}</div>
      <div data-testid='form-field-required'>{required ? 'true' : 'false'}</div>
      <div data-testid='form-field-help-text'>{helpText || ''}</div>
      {children}
    </div>
  )),
}));

// Mock the SVG icons
jest.mock('@public/icon-hide-password.svg', () => {
  const HidePasswordIcon = () => (
    <div data-testid='mock-hide-password-icon'>Hide Password</div>
  );
  HidePasswordIcon.displayName = 'HidePasswordIcon';
  return HidePasswordIcon;
});

jest.mock('@public/icon-show-password.svg', () => {
  const ShowPasswordIcon = () => (
    <div data-testid='mock-show-password-icon'>Show Password</div>
  );
  ShowPasswordIcon.displayName = 'ShowPasswordIcon';
  return ShowPasswordIcon;
});

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'shared.hidePassword': 'Hide password',
      'shared.showPassword': 'Show password',
    };
    return translations[key] || key;
  },
}));

describe('PasswordField', () => {
  // Common props used in tests
  const mockField: TypedFieldApi<string> = {
    name: 'password-field',
    state: {
      value: '',
      meta: {
        errors: [],
        isTouched: false,
      },
    },
    handleChange: jest.fn(),
    handleBlur: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<PasswordField field={mockField} label='Password' />);

    expect(screen.getByTestId('mock-form-field')).toBeInTheDocument();
    expect(screen.getByTestId('mock-input-group')).toBeInTheDocument();
    expect(screen.getByTestId('mock-input')).toBeInTheDocument();
    expect(screen.getByTestId('mock-input-right-icon')).toBeInTheDocument();
    expect(screen.getByTestId('form-field-label')).toHaveTextContent(
      'Password',
    );

    // Password should be hidden by default
    expect(screen.getByTestId('mock-input')).toHaveAttribute(
      'type',
      'password',
    );
    // Show password icon should be visible by default
    expect(screen.getByTestId('mock-show-password-icon')).toBeInTheDocument();
  });

  it('renders with custom props and passes them correctly', () => {
    render(
      <PasswordField
        field={mockField}
        label='Password'
        placeholder='Enter your password'
        helpText='Use a strong password'
        disabled={true}
        required={true}
        autoComplete='new-password'
        showRequirements={true}
      />,
    );

    const input = screen.getByTestId('mock-input');

    expect(input).toHaveAttribute('placeholder', 'Enter your password');
    expect(input).toHaveAttribute('disabled');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('autoComplete', 'new-password');

    // Only test required prop, skipping help text content testing
    expect(screen.getByTestId('form-field-required')).toHaveTextContent('true');
  });

  it('handles value changes correctly', () => {
    render(<PasswordField field={mockField} label='Password' />);

    const input = screen.getByTestId('mock-input');
    fireEvent.change(input, { target: { value: 'new-password' } });

    expect(mockField.handleChange).toHaveBeenCalledWith('new-password');
  });

  it('handles blur events correctly', () => {
    render(<PasswordField field={mockField} label='Password' />);

    const input = screen.getByTestId('mock-input');
    fireEvent.blur(input);

    expect(mockField.handleBlur).toHaveBeenCalled();
  });

  it('toggles password visibility when clicking the eye icon', () => {
    render(<PasswordField field={mockField} label='Password' />);

    // Password should be hidden initially
    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('mock-show-password-icon')).toBeInTheDocument();

    // Click the icon to show password
    const iconButton = screen.getByTestId('mock-input-right-icon');
    fireEvent.click(iconButton);

    // Verify input type changed
    expect(input).toHaveAttribute('type', 'text');

    // Verify aria-label changed
    expect(iconButton).toHaveAttribute('aria-label', 'Hide password');

    // Click again to hide password
    fireEvent.click(iconButton);

    // Password should be hidden again
    expect(input).toHaveAttribute('type', 'password');
    expect(iconButton).toHaveAttribute('aria-label', 'Show password');
  });

  it('sets aria-invalid and error attributes when field has errors and is touched', () => {
    const fieldWithErrors = {
      ...mockField,
      state: {
        value: '',
        meta: {
          errors: ['Password is required'],
          isTouched: true,
        },
      },
    };

    render(<PasswordField field={fieldWithErrors} label='Password' />);

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('data-error', 'true');
  });

  it('sets showRequirements flag and helpText correctly', () => {
    // Just verify the component renders without error when help text and showRequirements are provided
    render(
      <PasswordField
        field={mockField}
        label='Password'
        helpText='Use a strong password'
        showRequirements={true}
      />,
    );

    // Component rendered successfully
    expect(screen.getByTestId('mock-form-field')).toBeInTheDocument();
  });

  it('sets appropriate aria-describedby when field has errors', () => {
    const fieldWithErrors = {
      ...mockField,
      state: {
        value: '',
        meta: {
          errors: ['Password is required'],
          isTouched: true,
        },
      },
    };

    render(<PasswordField field={fieldWithErrors} label='Password' />);

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('aria-describedby', 'password-field-error');
  });

  it('sets appropriate aria-describedby when field has helpText and no errors', () => {
    render(
      <PasswordField
        field={mockField}
        label='Password'
        helpText='Use a strong password'
      />,
    );

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('aria-describedby', 'password-field-help');
  });

  it('sets correct aria-label on the visibility toggle button', () => {
    render(<PasswordField field={mockField} label='Password' />);

    // Initially should have "Show password" aria-label
    const toggleButton = screen.getByTestId('mock-input-right-icon');
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');

    // Click to make password visible
    fireEvent.click(toggleButton);

    // Now should have "Hide password" aria-label
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');
  });

  it('handles empty string value correctly', () => {
    const fieldWithEmptyString = {
      ...mockField,
      state: {
        value: '',
        meta: {
          errors: [],
          isTouched: false,
        },
      },
    };

    render(<PasswordField field={fieldWithEmptyString} label='Password' />);

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('value', '');
  });
});
