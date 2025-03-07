import { ApiError, ApiErrorDetails, ErrorCode } from '@repo/types';
import { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { z } from 'zod';

/**
 * Create a standardized error response
 */
export const createErrorResponse = (
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown,
): ApiError => {
  return {
    success: false,
    error: {
      code,
      message,
      requestId,
      details,
    },
  };
};

/**
 * Map HTTP status codes to our error codes
 */
export const mapHttpStatusToErrorCode = (status: number): ErrorCode => {
  switch (status) {
    case 400:
      return ErrorCode.VALIDATION_ERROR;
    case 401:
      return ErrorCode.AUTHENTICATION_ERROR;
    case 403:
      return ErrorCode.AUTHORIZATION_ERROR;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 500:
    case 502:
    case 503:
      return ErrorCode.SERVER_ERROR;
    default:
      return ErrorCode.UNKNOWN_ERROR;
  }
};

/**
 * Format validation errors from Zod to our standard format
 */
export const formatZodErrors = (
  errors: z.ZodIssue[],
): Record<string, string[]> => {
  const validationErrors: Record<string, string[]> = {};

  errors.forEach((error) => {
    // Handle case where path might be empty
    const field = error.path[0]?.toString() || 'form';
    if (!validationErrors[field]) {
      validationErrors[field] = [];
    }
    validationErrors[field].push(error.message);
  });

  return validationErrors;
};

/**
 * Gets a user-friendly error message based on error code
 */
export const getUserFriendlyErrorMessage = (
  apiError: ApiErrorDetails,
): string => {
  switch (apiError.code) {
    case ErrorCode.VALIDATION_ERROR:
      return 'Please check your input';
    case ErrorCode.AUTHENTICATION_ERROR:
      return 'Invalid email or password';
    case ErrorCode.AUTHORIZATION_ERROR:
      return 'You do not have permission to perform this action';
    case ErrorCode.NETWORK_ERROR:
      return 'Network error. Please check your connection';
    case ErrorCode.SERVER_ERROR:
      return 'Server error. Please try again later';
    default:
      return apiError.message || 'An unexpected error occurred';
  }
};

/**
 * Maps API validation errors to react-hook-form errors
 */
export const mapApiErrorsToFormErrors = <T extends FieldValues>(
  setError: UseFormSetError<T>,
  apiError: ApiErrorDetails,
): void => {
  // Handle validation errors specially
  if (
    apiError.code === ErrorCode.VALIDATION_ERROR &&
    apiError.validationErrors
  ) {
    // Map each validation error to the corresponding form field
    Object.entries(apiError.validationErrors).forEach(([field, messages]) => {
      try {
        // Type-safe approach to setting field errors
        setError(field as Path<T>, {
          type: 'server',
          message: messages[0] || 'Invalid value',
        });
      } catch (error) {
        console.error('Error setting field error:', error as Error);
        // If field doesn't exist in form, set as root error
        setError('root' as Path<T>, {
          type: 'server',
          message: `${field}: ${messages[0]}`,
        });
      }
    });
    return;
  }

  // For non-validation errors, set a root error
  setError('root' as Path<T>, {
    type: 'server',
    message: apiError.message || 'An error occurred',
  });
};
