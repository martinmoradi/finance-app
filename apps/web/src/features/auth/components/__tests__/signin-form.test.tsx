import { SigninForm } from '@/features/auth/components/signin-form';
import { handleAuthFormError } from '@/features/auth/utils/auth-form-error-handler';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

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

  it('should handle authentication failure and display error', async () => {
    // Mock failed signin
    const errorResult = {
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'auth/invalid-credentials',
      },
    };
    mockSignin.mockResolvedValueOnce(errorResult);

    // Render the component
    render(<SigninForm />);

    // Get form elements
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for form submission to complete
    await waitFor(() => {
      expect(mockSignin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    // Verify error handler is called with the error result
    await waitFor(() => {
      expect(handleAuthFormError).toHaveBeenCalledWith(
        errorResult,
        expect.any(Function),
        'signin',
      );
    });

    // Verify we don't redirect on error
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show loading state while submitting the form', async () => {
    // Initially render with idle status
    mockAuthStatus = 'idle';

    const { rerender } = render(<SigninForm />);

    // Get form elements
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Now change the status to loading and rerender
    mockAuthStatus = 'loading';
    rerender(<SigninForm />);

    // Check for loading indicator
    expect(screen.getByText('Signing in...')).toBeInTheDocument();

    // Verify inputs and button are disabled during loading
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(screen.getByRole('button', { name: /Signing in/i })).toBeDisabled();
  });

  it('should clear errors when form is submitted', async () => {
    // Mock successful signin
    mockSignin.mockResolvedValueOnce({
      success: true,
      data: { id: '1' },
    });

    // Render the component
    render(<SigninForm />);

    // Get form elements
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify clearErrors is called before signin
    expect(mockClearErrors).toHaveBeenCalled();

    // Check call order by examining the mock calls array
    const clearErrorsCallIndex = mockClearErrors.mock.invocationCallOrder[0];
    const signinCallIndex = mockSignin.mock.invocationCallOrder[0];
    if (clearErrorsCallIndex === undefined || signinCallIndex === undefined) {
      fail('Expected clearErrors to be called before signin');
    }
    expect(clearErrorsCallIndex).toBeLessThan(signinCallIndex);
  });

  it('should clear errors when component unmounts', async () => {
    // Render the component
    const { unmount } = render(<SigninForm />);

    // Unmount the component
    unmount();

    // Verify clearErrors is called on unmount
    expect(mockClearErrors).toHaveBeenCalled();
  });

  it('should handle authentication failure and display error', async () => {
    // Mock failed signin
    const errorResult = {
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'auth/invalid-credentials',
      },
    };
    mockSignin.mockResolvedValueOnce(errorResult);

    // Render the component
    render(<SigninForm />);

    // Get form elements
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for form submission to complete
    await waitFor(() => {
      expect(mockSignin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    // Verify error handler is called with the error result
    await waitFor(() => {
      expect(handleAuthFormError).toHaveBeenCalledWith(
        errorResult,
        expect.any(Function),
        'signin',
      );
    });

    // Verify we don't redirect on error
    expect(mockPush).not.toHaveBeenCalled();
  });
});
