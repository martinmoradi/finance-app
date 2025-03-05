import { ErrorCode } from '@repo/types';
import { ApiResponse } from '@repo/types';
import { z } from 'zod';

/**
 * Create a standardized error response
 */
export const createErrorResponse = <T>(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ApiResponse<T> => {
  return {
    success: false,
    error: {
      code,
      message,
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
