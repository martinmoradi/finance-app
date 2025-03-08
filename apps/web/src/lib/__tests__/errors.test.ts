import { ApiErrorDetails, ErrorCode } from '@repo/types';
import {
  createErrorResponse,
  mapHttpStatusToErrorCode,
  formatZodErrors,
  getUserFriendlyErrorMessage,
  mapApiErrorsToFormErrors,
} from '@/lib/errors';
import { z } from 'zod';

describe('createErrorResponse', () => {
  it('should create a properly structured error response', () => {
    const result = createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid input',
      'req-123',
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input',
        requestId: 'req-123',
        details: undefined,
      },
    });
  });

  it('should include details when provided', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const result = createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid input',
      'req-123',
      details,
    );

    expect(result.error.details).toEqual(details);
  });
});

describe('mapHttpStatusToErrorCode', () => {
  it('should map 400 to VALIDATION_ERROR', () => {
    expect(mapHttpStatusToErrorCode(400)).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('should map 401 to AUTHENTICATION_ERROR', () => {
    expect(mapHttpStatusToErrorCode(401)).toBe(ErrorCode.AUTHENTICATION_ERROR);
  });

  it('should map 403 to AUTHORIZATION_ERROR', () => {
    expect(mapHttpStatusToErrorCode(403)).toBe(ErrorCode.AUTHORIZATION_ERROR);
  });

  it('should map 404 to NOT_FOUND', () => {
    expect(mapHttpStatusToErrorCode(404)).toBe(ErrorCode.NOT_FOUND);
  });

  it('should map 409 to CONFLICT', () => {
    expect(mapHttpStatusToErrorCode(409)).toBe(ErrorCode.CONFLICT);
  });

  it('should map server errors (500, 502, 503) to SERVER_ERROR', () => {
    expect(mapHttpStatusToErrorCode(500)).toBe(ErrorCode.SERVER_ERROR);
    expect(mapHttpStatusToErrorCode(502)).toBe(ErrorCode.SERVER_ERROR);
    expect(mapHttpStatusToErrorCode(503)).toBe(ErrorCode.SERVER_ERROR);
  });

  it('should map unknown status codes to UNKNOWN_ERROR', () => {
    expect(mapHttpStatusToErrorCode(418)).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(mapHttpStatusToErrorCode(422)).toBe(ErrorCode.UNKNOWN_ERROR);
  });
});

describe('formatZodErrors', () => {
  it('should format Zod errors into the expected structure', () => {
    const zodIssues: z.ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['email'],
        message: 'Email is required',
      },
      {
        code: 'too_small',
        minimum: 8,
        type: 'string',
        inclusive: true,
        path: ['password'],
        message: 'Password must be at least 8 characters',
      },
    ];

    const result = formatZodErrors(zodIssues);

    expect(result).toEqual({
      email: ['Email is required'],
      password: ['Password must be at least 8 characters'],
    });
  });

  it('should handle multiple errors for the same field', () => {
    const zodIssues: z.ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['email'],
        message: 'Email is required',
      },
      {
        code: 'invalid_string',
        validation: 'email',
        path: ['email'],
        message: 'Invalid email format',
      },
    ];

    const result = formatZodErrors(zodIssues);

    expect(result).toEqual({
      email: ['Email is required', 'Invalid email format'],
    });
  });

  it('should use "form" as the field when path is empty', () => {
    const zodIssues: z.ZodIssue[] = [
      {
        code: 'custom',
        path: [],
        message: 'Form submission failed',
      },
    ];

    const result = formatZodErrors(zodIssues);

    expect(result).toEqual({
      form: ['Form submission failed'],
    });
  });
});

describe('getUserFriendlyErrorMessage', () => {
  it('should return appropriate message for VALIDATION_ERROR', () => {
    const apiError: ApiErrorDetails = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Original message',
    };
    expect(getUserFriendlyErrorMessage(apiError)).toBe(
      'Please check your input',
    );
  });

  it('should return appropriate message for AUTHENTICATION_ERROR', () => {
    const apiError: ApiErrorDetails = {
      code: ErrorCode.AUTHENTICATION_ERROR,
      message: 'Original message',
    };
    expect(getUserFriendlyErrorMessage(apiError)).toBe(
      'Invalid email or password',
    );
  });

  it('should return appropriate message for AUTHORIZATION_ERROR', () => {
    const apiError: ApiErrorDetails = {
      code: ErrorCode.AUTHORIZATION_ERROR,
      message: 'Original message',
    };
    expect(getUserFriendlyErrorMessage(apiError)).toBe(
      'You do not have permission to perform this action',
    );
  });

  it('should return appropriate message for NETWORK_ERROR', () => {
    const apiError: ApiErrorDetails = {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Original message',
    };
    expect(getUserFriendlyErrorMessage(apiError)).toBe(
      'Network error. Please check your connection',
    );
  });

  it('should return appropriate message for SERVER_ERROR', () => {
    const apiError: ApiErrorDetails = {
      code: ErrorCode.SERVER_ERROR,
      message: 'Original message',
    };
    expect(getUserFriendlyErrorMessage(apiError)).toBe(
      'Server error. Please try again later',
    );
  });

  it('should return original message for unknown error codes', () => {
    const apiError: ApiErrorDetails = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'Original message',
    };
    expect(getUserFriendlyErrorMessage(apiError)).toBe('Original message');
  });

  it('should return default message when original message is empty', () => {
    const apiError: ApiErrorDetails = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: '',
    };
    expect(getUserFriendlyErrorMessage(apiError)).toBe(
      'An unexpected error occurred',
    );
  });
});

describe('mapApiErrorsToFormErrors', () => {
  it('should map validation errors to form fields', () => {
    const setError = jest.fn();
    const apiError: ApiErrorDetails = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      validationErrors: {
        email: ['Invalid email format'],
        password: ['Password too short'],
      },
    };

    mapApiErrorsToFormErrors(setError, apiError);

    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Invalid email format',
    });
    expect(setError).toHaveBeenCalledWith('password', {
      type: 'server',
      message: 'Password too short',
    });
  });

  it('should set root error for non-validation errors', () => {
    const setError = jest.fn();
    const apiError: ApiErrorDetails = {
      code: ErrorCode.SERVER_ERROR,
      message: 'Internal server error',
    };

    mapApiErrorsToFormErrors(setError, apiError);

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith('root', {
      type: 'server',
      message: 'Internal server error',
    });
  });

  it('should handle field errors that fail to set', () => {
    const setError = jest.fn();
    // First call succeeds
    setError.mockImplementationOnce(() => {});
    // Second call throws an error
    setError.mockImplementationOnce(() => {
      throw new Error('Field not found');
    });

    const apiError: ApiErrorDetails = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      validationErrors: {
        email: ['Invalid email format'],
        nonExistentField: ['This field does not exist'],
      },
    };

    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mapApiErrorsToFormErrors(setError, apiError);

    expect(setError).toHaveBeenCalledTimes(3);
    // First call should be for the valid field
    expect(setError).toHaveBeenCalledWith('email', expect.any(Object));
    // After error, should set a root error with the field name
    expect(setError).toHaveBeenCalledWith('root', {
      type: 'server',
      message: 'nonExistentField: This field does not exist',
    });
    // Verify console.error was called
    expect(console.error).toHaveBeenCalled();
  });

  it('should use first validation message when multiple exist', () => {
    const setError = jest.fn();
    const apiError: ApiErrorDetails = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      validationErrors: {
        email: ['Invalid format', 'Email already exists'],
      },
    };

    mapApiErrorsToFormErrors(setError, apiError);

    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Invalid format',
    });
  });

  it('should use "Invalid value" when validation message is empty', () => {
    const setError = jest.fn();
    const apiError: ApiErrorDetails = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      validationErrors: {
        email: [],
      },
    };

    mapApiErrorsToFormErrors(setError, apiError);

    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Invalid value',
    });
  });

  it('should use default message for non-validation errors with empty message', () => {
    const setError = jest.fn();
    const apiError: ApiErrorDetails = {
      code: ErrorCode.SERVER_ERROR,
      message: '',
    };

    mapApiErrorsToFormErrors(setError, apiError);

    expect(setError).toHaveBeenCalledWith('root', {
      type: 'server',
      message: 'An error occurred',
    });
  });
});
