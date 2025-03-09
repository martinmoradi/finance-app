import { SignupForm } from '@/features/auth/components/signup-form';
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

  it('should submit form with user details and redirect on success', async () => {
    // Mock successful signup
    mockSignup.mockResolvedValueOnce({
      success: true,
      data: { id: '1', email: 'user@example.com', name: 'Test User' },
    });

    // Render the component
    render(<SignupForm />);

    // Get form elements
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign up/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for form submission to complete
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'user@example.com',
        password: 'password123',
      });
    });

    // Verify toast success notification and redirect after successful signup
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Account created successfully',
      );
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should handle authentication failure and display error', async () => {
    // Mock failed signup
    const errorResult = {
      success: false,
      error: {
        message: 'Email already in use',
        code: 'auth/email-already-in-use',
      },
    };
    mockSignup.mockResolvedValueOnce(errorResult);

    // Render the component
    render(<SignupForm />);

    // Get form elements
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign up/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for form submission to complete
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'user@example.com',
        password: 'password123',
      });
    });

    // Verify error handler is called with the error result
    await waitFor(() => {
      expect(handleAuthFormError).toHaveBeenCalledWith(
        errorResult,
        expect.any(Function),
        'signup',
      );
    });

    // Verify we don't redirect on error
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show loading state while submitting the form', async () => {
    // Initially render with idle status
    mockAuthStatus = 'idle';

    const { rerender } = render(<SignupForm />);

    // Get form elements
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign up/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Now change the status to loading and rerender
    mockAuthStatus = 'loading';
    rerender(<SignupForm />);

    // Check for loading indicator
    expect(screen.getByText('Creating account...')).toBeInTheDocument();

    // Verify inputs and button are disabled during loading
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Creating account/i }),
    ).toBeDisabled();
  });

  it('should clear errors when form is submitted', async () => {
    // Mock successful signup
    mockSignup.mockResolvedValueOnce({
      success: true,
      data: { id: '1' },
    });

    // Render the component
    render(<SignupForm />);

    // Get form elements
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign up/i });

    // Fill in the form
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify clearErrors is called before signup
    expect(mockClearErrors).toHaveBeenCalled();

    // Check call order by examining the mock calls array
    const clearErrorsCallIndex = mockClearErrors.mock.invocationCallOrder[0];
    const signupCallIndex = mockSignup.mock.invocationCallOrder[0];
    if (clearErrorsCallIndex === undefined || signupCallIndex === undefined) {
      fail('Expected clearErrors to be called before signup');
    }
    expect(clearErrorsCallIndex).toBeLessThan(signupCallIndex);
  });

  it('should clear errors when component unmounts', async () => {
    // Render the component
    const { unmount } = render(<SignupForm />);

    // Unmount the component
    unmount();

    // Verify clearErrors is called on unmount
    expect(mockClearErrors).toHaveBeenCalled();
  });
});
