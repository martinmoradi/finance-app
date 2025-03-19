import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SignupForm } from '../signup-form';
import type { FieldApi } from '@tanstack/react-form';

// Types for mocking TanStack Form's complex form field structure
type FormSubmitHandler = (arg: { value: any }) => Promise<void>;
type FieldProps = {
  field: FormField;
  label: string;
  disabled?: boolean;
  [key: string]: any;
};
type MockCall = [props: FieldProps, context?: any];
type TranslationFn = (key: string) => string;
type FormField = {
  name: string;
  value: string;
  setValue: jest.Mock;
  meta: {
    touchedErrors: string[];
    isInvalid: boolean;
    errors?: unknown[] | null;
  };
  state: {
    value: string;
    meta: { errors?: unknown[] | null; isTouched: boolean };
  };
  handleChange: jest.Mock;
  handleBlur: jest.Mock;
  getFieldMeta?: jest.Mock;
};

jest.mock('@/features/auth/actions/check-user-exists', () => ({
  checkUserExists: jest.fn().mockImplementation(async (email) => {
    return { success: true, data: email === 'test@exists.com' };
  }),
}));

jest.mock('@/features/auth/store/useAuth', () => ({
  useAuth: jest.fn().mockReturnValue({
    signup: jest.fn().mockResolvedValue({ success: true }),
    status: 'idle',
    clearErrors: jest.fn(),
  }),
}));

jest.mock('@/i18n/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock translation to return the key itself for easier testing
jest.mock('next-intl', () => ({
  useTranslations: jest.fn().mockImplementation(
    (): TranslationFn =>
      (key: string): string =>
        key,
  ),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/features/auth/components/text-input-field', () => ({
  TextInputField: jest
    .fn()
    .mockImplementation(({ label }: { label: string }) => (
      <div data-testid='text-input-field'>
        <label>{label}</label>
        <input aria-label={label} />
      </div>
    )),
}));

jest.mock('@/features/auth/components/password-input-field', () => ({
  PasswordField: jest
    .fn()
    .mockImplementation(({ label }: { label: string }) => (
      <div data-testid='password-field'>
        <label>{label}</label>
        <input type='password' aria-label={label} />
      </div>
    )),
}));

jest.mock('@repo/validation', () => ({
  signupFormSchema: {
    async: jest.fn(),
    sync: jest.fn(),
  },
}));

// Stateful mock storage for TanStack form fields
const formFieldMocks = new Map<string, FormField>();
const formGetFieldMeta = jest.fn().mockImplementation((fieldName) => {
  return { errors: [] };
});

// Complex mock of TanStack form to simulate form state and field management
jest.mock('@tanstack/react-form', () => ({
  useForm: jest
    .fn()
    .mockImplementation(
      ({ onSubmit }: { onSubmit: (arg: { value: any }) => Promise<void> }) => {
        formFieldMocks.clear();

        return {
          Field: ({
            name,
            children,
            validators,
          }: {
            name: string;
            validators?: any;
            children: (field: FormField) => React.ReactNode;
          }) => {
            if (!formFieldMocks.has(name)) {
              const field: FormField = {
                name,
                value: '',
                setValue: jest.fn(),
                meta: { touchedErrors: [], isInvalid: false, errors: null },
                state: {
                  value: '',
                  meta: { errors: null, isTouched: false },
                },
                handleChange: jest.fn(),
                handleBlur: jest.fn(),
              };
              formFieldMocks.set(name, field);
            }

            const field = formFieldMocks.get(name)!;
            return <div data-testid={`field-${name}`}>{children(field)}</div>;
          },
          Subscribe: ({
            children,
          }: {
            children: (values: [boolean, boolean]) => React.ReactNode;
          }) => {
            return children([true, false]);
          },
          handleSubmit: jest.fn().mockImplementation(() =>
            onSubmit({
              value: {
                email: 'test@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
              },
            }),
          ),
          getFieldMeta: formGetFieldMeta,
        };
      },
    ),
}));

import { useAuth } from '@/features/auth/store/useAuth';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { checkUserExists } from '@/features/auth/actions/check-user-exists';

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedCheckUserExists = checkUserExists as jest.MockedFunction<
  typeof checkUserExists
>;

describe('SignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    formFieldMocks.clear();
    formGetFieldMeta.mockReturnValue({ errors: [] });
  });

  it('renders all form fields correctly', () => {
    render(<SignupForm />);
    expect(screen.getByTestId('field-email')).toBeInTheDocument();
    expect(screen.getByTestId('field-password')).toBeInTheDocument();
    expect(screen.getByTestId('field-confirmPassword')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles successful form submission', async () => {
    const mockSignup = jest.fn().mockResolvedValue({ success: true });
    const mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };

    mockedUseAuth.mockReturnValue({
      signup: mockSignup,
      status: 'idle',
      clearErrors: jest.fn(),
    });

    mockedUseRouter.mockReturnValue(mockRouter);

    render(<SignupForm />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    expect(toast.success).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('handles form submission failure', async () => {
    const mockSignup = jest.fn().mockResolvedValue({ success: false });

    mockedUseAuth.mockReturnValue({
      signup: mockSignup,
      status: 'idle',
      clearErrors: jest.fn(),
    });

    render(<SignupForm />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalled();
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it('shows loading state when submitting', () => {
    mockedUseAuth.mockReturnValue({
      signup: jest.fn(),
      status: 'loading',
      clearErrors: jest.fn(),
    });

    const { useForm } = jest.requireMock('@tanstack/react-form');

    // Override Subscribe to simulate form submission state
    useForm.mockReturnValueOnce({
      Field: ({
        name,
        children,
        validators,
      }: {
        name: string;
        validators?: any;
        children: (field: FormField) => React.ReactNode;
      }) => {
        if (!formFieldMocks.has(name)) {
          const field: FormField = {
            name,
            value: '',
            setValue: jest.fn(),
            meta: { touchedErrors: [], isInvalid: false, errors: null },
            state: {
              value: '',
              meta: { errors: null, isTouched: false },
            },
            handleChange: jest.fn(),
            handleBlur: jest.fn(),
          };
          formFieldMocks.set(name, field);
        }

        const field = formFieldMocks.get(name)!;
        return <div data-testid={`field-${name}`}>{children(field)}</div>;
      },
      Subscribe: ({
        children,
      }: {
        children: (values: [boolean, boolean]) => React.ReactNode;
      }) => {
        return children([false, true]); // [isValidating, isSubmitting]
      },
      handleSubmit: jest.fn(),
      getFieldMeta: formGetFieldMeta,
    });

    render(<SignupForm />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('clears errors on component unmount', () => {
    const mockClearErrors = jest.fn();
    mockedUseAuth.mockReturnValue({
      signup: jest.fn(),
      status: 'idle',
      clearErrors: mockClearErrors,
    });

    const { unmount } = render(<SignupForm />);
    unmount();
    expect(mockClearErrors).toHaveBeenCalled();
  });

  it('checks if user exists during email validation', async () => {
    // Complex test setup to capture and test the email validator
    const { useForm } = jest.requireMock('@tanstack/react-form');
    let capturedValidator: any;

    useForm.mockImplementationOnce(
      ({ onSubmit }: { onSubmit: FormSubmitHandler }) => {
        return {
          Field: ({
            name,
            children,
            validators,
          }: {
            name: string;
            validators?: any;
            children: (field: FormField) => React.ReactNode;
          }) => {
            if (name === 'email' && validators) {
              capturedValidator = validators.onBlurAsync;
            }

            if (!formFieldMocks.has(name)) {
              const field: FormField = {
                name,
                value: '',
                setValue: jest.fn(),
                meta: { touchedErrors: [], isInvalid: false, errors: null },
                state: {
                  value: '',
                  meta: { errors: null, isTouched: false },
                },
                handleChange: jest.fn(),
                handleBlur: jest.fn(),
              };
              formFieldMocks.set(name, field);
            }

            const field = formFieldMocks.get(name)!;
            return <div data-testid={`field-${name}`}>{children(field)}</div>;
          },
          Subscribe: ({
            children,
          }: {
            children: (values: [boolean, boolean]) => React.ReactNode;
          }) => children([true, false]),
          handleSubmit: jest
            .fn()
            .mockImplementation(() => onSubmit({ value: {} })),
          getFieldMeta: formGetFieldMeta,
        };
      },
    );

    render(<SignupForm />);
    expect(capturedValidator).toBeDefined();

    // Test validation scenarios
    formGetFieldMeta.mockReturnValue({ errors: [] });
    const resultForNewEmail = await capturedValidator({
      value: 'new@example.com',
    });
    expect(resultForNewEmail).toBeUndefined();
    expect(mockedCheckUserExists).toHaveBeenCalledWith('new@example.com');

    formGetFieldMeta.mockReturnValue({ errors: [] });
    const resultForExistingEmail = await capturedValidator({
      value: 'test@exists.com',
    });
    expect(resultForExistingEmail).toEqual({
      message: 'validation.email.alreadyExists',
    });
    expect(mockedCheckUserExists).toHaveBeenCalledWith('test@exists.com');

    // Skip validation if field already has errors
    formGetFieldMeta.mockReturnValue({ errors: ['Some error'] });
    const resultWithExistingErrors = await capturedValidator({
      value: 'any@email.com',
    });
    expect(resultWithExistingErrors).toBeUndefined();
    expect(mockedCheckUserExists).not.toHaveBeenCalledWith('any@email.com');
  });

  it('disables form fields when loading', () => {
    mockedUseAuth.mockReturnValue({
      signup: jest.fn(),
      status: 'loading',
      clearErrors: jest.fn(),
    });

    const { TextInputField } = jest.requireMock(
      '@/features/auth/components/text-input-field',
    );
    const { PasswordField } = jest.requireMock(
      '@/features/auth/components/password-input-field',
    );

    render(<SignupForm />);

    TextInputField.mock.calls.forEach((call: MockCall) => {
      expect(call[0].disabled).toBe(true);
    });

    PasswordField.mock.calls.forEach((call: MockCall) => {
      expect(call[0].disabled).toBe(true);
    });
  });

  it('passes showRequirements to password field', () => {
    const { PasswordField } = jest.requireMock(
      '@/features/auth/components/password-input-field',
    );

    render(<SignupForm />);

    const passwordFieldCalls = PasswordField.mock.calls.filter(
      (call: MockCall) => call[0].field.name === 'password',
    );
    expect(passwordFieldCalls[0][0].showRequirements).toBe(true);

    const confirmPasswordFieldCalls = PasswordField.mock.calls.filter(
      (call: MockCall) => call[0].field.name === 'confirmPassword',
    );
    expect(confirmPasswordFieldCalls[0][0].showRequirements).toBeFalsy();
  });
});
