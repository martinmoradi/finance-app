import { ApiError, ErrorCode } from '@repo/types';

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
