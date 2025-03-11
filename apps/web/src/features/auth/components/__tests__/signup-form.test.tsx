import { SignupForm } from '@/features/auth/components/signup-form';
import { handleAuthFormError } from '@/features/auth/utils/auth-form-error-handler';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

// Mock dependencies
const mockPush = jest.fn();
const mockSignup = jest.fn();
const mockClearErrors = jest.fn();
let mockAuthStatus = 'idle';

// Mock modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/features/auth/store/useAuth', () => ({
  useAuth: () => ({
    signup: mockSignup,
    status: mockAuthStatus,
    clearErrors: mockClearErrors,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/features/auth/utils/auth-form-error-handler', () => ({
  handleAuthFormError: jest.fn(),
}));

// Mock zodResolver to avoid validation issues during testing
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => (data: unknown) => {
    return {
      values: data,
      errors: {},
    };
  },
}));

describe('SignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStatus = 'idle';
  });

  it('should initialize the form with empty default values', () => {
    render(<SignupForm />);

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Create a password');

    expect(nameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
  });

  it('should render the login link with correct href', () => {
    render(<SignupForm />);

    const loginLink = screen.getByRole('link', { name: /Login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should show password requirements hint when password field is not in error state', () => {
    render(<SignupForm />);

    const passwordHint = screen.getByText(
      'Password must be at least 8 characters',
    );
    expect(passwordHint).toBeInTheDocument();
    expect(passwordHint).toHaveClass('text-muted-foreground');
  });

  it('should toggle password visibility when the eye icon is clicked', async () => {
    render(<SignupForm />);

    const passwordInput = screen.getByPlaceholderText('Create a password');
    const visibilityToggle = screen.getByLabelText('Show password');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await act(async () => {
      fireEvent.click(visibilityToggle);
    });

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Hide password'));
    });

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Show password')).toBeInTheDocument();
  });

  it('should submit form with user details and redirect on success', async () => {
    mockSignup.mockResolvedValueOnce({
      success: true,
      data: { id: '1', email: 'user@example.com', name: 'Test User' },
    });

    render(<SignupForm />);

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Create a password');
    const submitButton = screen.getByRole('button', {
      name: /Create Account/i,
    });

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'user@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Account created successfully',
      );
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should show loading state while submitting the form', async () => {
    mockAuthStatus = 'idle';
    const { rerender } = render(<SignupForm />);

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Create a password');
    const submitButton = screen.getByRole('button', {
      name: /Create Account/i,
    });

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    mockAuthStatus = 'loading';
    rerender(<SignupForm />);

    expect(screen.getByText('Creating account...')).toBeInTheDocument();
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Creating account/i }),
    ).toBeDisabled();
  });

  it('should handle authentication failure and display error', async () => {
    const errorResult = {
      success: false,
      error: {
        message: 'Email already in use',
        code: 'auth/email-already-in-use',
      },
    };
    mockSignup.mockResolvedValueOnce(errorResult);

    render(<SignupForm />);

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Create a password');
    const submitButton = screen.getByRole('button', {
      name: /Create Account/i,
    });

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'user@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(handleAuthFormError).toHaveBeenCalledWith(
        errorResult,
        expect.any(Function),
        'signup',
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should display validation errors for empty fields when form is submitted', async () => {
    mockSignup.mockResolvedValueOnce({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'validation-error',
      },
    });

    (handleAuthFormError as jest.Mock).mockImplementationOnce(
      (result, setErrorFn) => {
        setErrorFn('name', { type: 'required', message: 'Name is required' });
        setErrorFn('email', { type: 'required', message: 'Email is required' });
        setErrorFn('password', {
          type: 'required',
          message: 'Password is required',
        });
      },
    );

    render(<SignupForm />);

    const submitButton = screen.getByRole('button', {
      name: /Create Account/i,
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockSignup).toHaveBeenCalled();
    expect(handleAuthFormError).toHaveBeenCalled();
  });

  it('should clear errors when form is submitted', async () => {
    mockSignup.mockResolvedValueOnce({
      success: true,
      data: { id: '1' },
    });

    render(<SignupForm />);

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Create a password');
    const submitButton = screen.getByRole('button', {
      name: /Create Account/i,
    });

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockClearErrors).toHaveBeenCalled();

    const clearErrorsCallIndex = mockClearErrors.mock.invocationCallOrder[0];
    const signupCallIndex = mockSignup.mock.invocationCallOrder[0];
    if (clearErrorsCallIndex === undefined || signupCallIndex === undefined) {
      fail('Expected clearErrors to be called before signup');
    }
    expect(clearErrorsCallIndex).toBeLessThan(signupCallIndex);
  });

  it('should clear errors when component unmounts', async () => {
    const { unmount } = render(<SignupForm />);
    unmount();
    expect(mockClearErrors).toHaveBeenCalled();
  });
});
