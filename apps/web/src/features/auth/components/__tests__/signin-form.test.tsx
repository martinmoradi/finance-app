import { SigninForm } from '@/features/auth/components/signin-form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

type TranslationFn = (key: string) => string;
type FormField = {
  name: string;
  value: string;
  setValue: jest.Mock;
  meta: { touchedErrors: string[]; isInvalid: boolean };
  state: { value: string };
  handleChange: jest.Mock;
  handleBlur: jest.Mock;
};

jest.mock('@/features/auth/store/useAuth', () => ({
  useAuth: jest.fn().mockReturnValue({
    signin: jest.fn().mockResolvedValue({ success: true }),
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
  signinFormSchema: {
    async: jest.fn(),
    sync: jest.fn(),
  },
}));

jest.mock('@tanstack/react-form', () => ({
  useForm: jest
    .fn()
    .mockImplementation(
      ({ onSubmit }: { onSubmit: (arg: { value: any }) => Promise<void> }) => ({
        Field: ({
          name,
          children,
        }: {
          name: string;
          children: (field: FormField) => React.ReactNode;
        }) => {
          const field: FormField = {
            name,
            value: '',
            setValue: jest.fn(),
            meta: { touchedErrors: [], isInvalid: false },
            state: { value: '' },
            handleChange: jest.fn(),
            handleBlur: jest.fn(),
          };
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
            value: { email: 'test@example.com', password: 'password123' },
          }),
        ),
      }),
    ),
}));

import { useAuth } from '@/features/auth/store/useAuth';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('SigninForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form correctly', () => {
    render(<SigninForm />);

    // Check for field rendering
    expect(screen.getByTestId('field-email')).toBeInTheDocument();
    expect(screen.getByTestId('field-password')).toBeInTheDocument();

    // Check for the submit button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles form submission correctly', async () => {
    const mockSignin = jest.fn().mockResolvedValue({ success: true });
    const mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };

    // Update the mocks for this test
    mockedUseAuth.mockReturnValue({
      signin: mockSignin,
      status: 'idle',
      clearErrors: jest.fn(),
    });

    mockedUseRouter.mockReturnValue(mockRouter);

    render(<SigninForm />);

    // Submit the form
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);

    // Wait for the form to submit
    await waitFor(() => {
      expect(mockSignin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Check toast was called
    expect(toast.success).toHaveBeenCalled();

    // Check router was called
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('handles form submission failure', async () => {
    const mockSignin = jest.fn().mockResolvedValue({ success: false });

    // Update the mock for this test
    mockedUseAuth.mockReturnValue({
      signin: mockSignin,
      status: 'idle',
      clearErrors: jest.fn(),
    });

    render(<SigninForm />);

    // Submit the form
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);

    // Wait for the form to submit
    await waitFor(() => {
      expect(mockSignin).toHaveBeenCalled();
    });

    // Check error toast was called
    expect(toast.error).toHaveBeenCalled();
  });

  it('shows loading state when submitting', () => {
    // Mock loading state
    mockedUseAuth.mockReturnValue({
      signin: jest.fn(),
      status: 'loading',
      clearErrors: jest.fn(),
    });

    // Get the mocked implementation from the module
    const { useForm } = jest.requireMock('@tanstack/react-form');

    // Override the mock for this specific test
    useForm.mockReturnValueOnce({
      Field: ({
        name,
        children,
      }: {
        name: string;
        children: (field: FormField) => React.ReactNode;
      }) => {
        const field: FormField = {
          name,
          value: '',
          setValue: jest.fn(),
          meta: { touchedErrors: [], isInvalid: false },
          state: { value: '' },
          handleChange: jest.fn(),
          handleBlur: jest.fn(),
        };
        return <div data-testid={`field-${name}`}>{children(field)}</div>;
      },
      Subscribe: ({
        children,
      }: {
        children: (values: [boolean, boolean]) => React.ReactNode;
      }) => {
        // Return isSubmitting as true
        return children([false, true]);
      },
      handleSubmit: jest.fn(),
    });

    render(<SigninForm />);

    // Check for loading indicator (relies on implementation details)
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
