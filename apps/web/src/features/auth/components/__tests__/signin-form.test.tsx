import { SigninForm } from '@/features/auth/components/signin-form';
import { handleAuthFormError } from '@/features/auth/utils/auth-form-error-handler';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { toast } from 'sonner';

// Mock dependencies
const mockPush = jest.fn();
const mockSignin = jest.fn();
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
    signin: mockSignin,
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

describe('SigninForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStatus = 'idle';
  });

  it('should initialize the form with empty default values', () => {
    render(<SigninForm />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');

    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
  });

  it('should display proper heading and button text', () => {
    render(<SigninForm />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Login');

    const submitButton = screen.getByRole('button', { name: /Login/i });
    expect(submitButton).toHaveTextContent('Login');
  });

  it('should render the sign up link with correct href', () => {
    render(<SigninForm />);

    const signUpLink = screen.getByRole('link', { name: /Sign up/i });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute('href', '/signup');
  });

  it('should display form with appropriate structure and styling', () => {
    render(<SigninForm />);

    const heading = screen.getByRole('heading', { level: 1 });
    const container = heading.closest('div.max-w-\\[56rem\\]');
    expect(container).toHaveClass(
      'max-w-[56rem]',
      'w-full',
      'rounded-xl',
      'bg-white',
    );

    const emailInput = screen.getByPlaceholderText('Enter your email address');
    expect(emailInput).toHaveAttribute(
      'placeholder',
      'Enter your email address',
    );

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');

    expect(screen.getByText('Need to create an account?')).toBeInTheDocument();
  });

  it('should toggle password visibility when the eye icon is clicked', async () => {
    render(<SigninForm />);

    const passwordInput = screen.getByPlaceholderText('Enter your password');
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

  it('should handle successful authentication and redirect', async () => {
    mockSignin.mockResolvedValueOnce({
      success: true,
      data: { id: '1' },
    });

    render(<SigninForm />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /Login/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Signed in successfully');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should show loading state while submitting the form', async () => {
    mockAuthStatus = 'idle';
    const { rerender } = render(<SigninForm />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /Login/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    mockAuthStatus = 'loading';
    rerender(<SigninForm />);

    expect(screen.getByText('Logging in...')).toBeInTheDocument();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(screen.getByRole('button', { name: /Logging in/i })).toBeDisabled();
  });

  it('should handle authentication failure and display error', async () => {
    const errorResult = {
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'auth/invalid-credentials',
      },
    };
    mockSignin.mockResolvedValueOnce(errorResult);

    render(<SigninForm />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /Login/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockSignin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(handleAuthFormError).toHaveBeenCalledWith(
        errorResult,
        expect.any(Function),
        'signin',
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should clear errors when form is submitted', async () => {
    mockSignin.mockResolvedValueOnce({
      success: true,
      data: { id: '1' },
    });

    render(<SigninForm />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /Login/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockClearErrors).toHaveBeenCalled();

    const clearErrorsCallIndex = mockClearErrors.mock.invocationCallOrder[0];
    const signinCallIndex = mockSignin.mock.invocationCallOrder[0];
    if (clearErrorsCallIndex === undefined || signinCallIndex === undefined) {
      fail('Expected clearErrors to be called before signin');
    }
    expect(clearErrorsCallIndex).toBeLessThan(signinCallIndex);
  });

  it('should clear errors when component unmounts', async () => {
    const { unmount } = render(<SigninForm />);
    unmount();
    expect(mockClearErrors).toHaveBeenCalled();
  });
});
