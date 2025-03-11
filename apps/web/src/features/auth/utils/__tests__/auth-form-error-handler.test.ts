import { handleAuthFormError } from '@/features/auth/utils/auth-form-error-handler';
import {
  getUserFriendlyErrorMessage,
  mapApiErrorsToFormErrors,
} from '@/lib/errors';
import { ApiError, ErrorCode } from '@repo/types';
import { Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/errors', () => ({
  getUserFriendlyErrorMessage: jest
    .fn()
    .mockReturnValue('Mocked error message'),
  mapApiErrorsToFormErrors: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe('handleAuthFormError', () => {
  // Define test form interface
  interface TestFormValues {
    email: string;
    password: string;
    [key: string]: any;
  }

  // Setup for each test
  let setError: jest.MockedFunction<UseFormSetError<TestFormValues>>;

  beforeEach(() => {
    setError = jest.fn();
    (toast.error as jest.Mock).mockClear();
    (mapApiErrorsToFormErrors as jest.Mock).mockClear();
    (getUserFriendlyErrorMessage as jest.Mock).mockClear();
  });

  it('should map validation errors when VALIDATION_ERROR has validationErrors', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        validationErrors: {
          email: ['Invalid email format'],
        },
      },
    };

    // Act
    handleAuthFormError(apiError, setError, 'signup');

    // Assert
    expect(mapApiErrorsToFormErrors).toHaveBeenCalledWith(
      setError,
      apiError.error,
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Please correct the errors in the form',
    );
  });

  it('should not map errors when VALIDATION_ERROR has no validationErrors', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
      },
    };

    // Act
    handleAuthFormError(apiError, setError, 'signup');

    // Assert
    expect(mapApiErrorsToFormErrors).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should set email error for CONFLICT during signup', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        code: ErrorCode.CONFLICT,
        message: 'Email already exists',
      },
    };

    // Act
    handleAuthFormError(apiError, setError, 'signup');

    // Assert
    expect(setError).toHaveBeenCalledWith('email' as Path<TestFormValues>, {
      type: 'server',
      message: 'An account with this email already exists',
    });
    expect(toast.error).toHaveBeenCalledWith(
      'An account with this email already exists',
    );
  });

  it('should set root error for CONFLICT during signin', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        code: ErrorCode.CONFLICT,
        message: 'Conflict error',
      },
    };

    // Act
    handleAuthFormError(apiError, setError, 'signin');

    // Assert
    expect(getUserFriendlyErrorMessage).toHaveBeenCalledWith(apiError.error);
    expect(setError).toHaveBeenCalledWith('root' as Path<TestFormValues>, {
      type: 'server',
      message: 'Mocked error message',
    });
    expect(toast.error).toHaveBeenCalledWith('Mocked error message');
  });

  it('should set invalid credentials error for AUTHENTICATION_ERROR during signin', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Authentication failed',
      },
    };

    // Act
    handleAuthFormError(apiError, setError, 'signin');

    // Assert
    expect(setError).toHaveBeenCalledWith('email' as Path<TestFormValues>, {
      type: 'server',
    });
    expect(setError).toHaveBeenCalledWith('password' as Path<TestFormValues>, {
      type: 'server',
    });
    expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
  });

  it('should set generic error for AUTHENTICATION_ERROR during signup', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Authentication error',
      },
    };

    // Act
    handleAuthFormError(apiError, setError, 'signup');

    // Assert
    expect(getUserFriendlyErrorMessage).toHaveBeenCalledWith(apiError.error);
    expect(setError).toHaveBeenCalledWith('root' as Path<TestFormValues>, {
      type: 'server',
      message: 'Mocked error message',
    });
    expect(toast.error).toHaveBeenCalledWith('Mocked error message');
  });

  it('should set generic error for any other error code', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: 'Server error',
      },
    };

    // Act
    handleAuthFormError(apiError, setError, 'signup');

    // Assert
    expect(getUserFriendlyErrorMessage).toHaveBeenCalledWith(apiError.error);
    expect(setError).toHaveBeenCalledWith('root' as Path<TestFormValues>, {
      type: 'server',
      message: 'Mocked error message',
    });
    expect(toast.error).toHaveBeenCalledWith('Mocked error message');
  });
});
