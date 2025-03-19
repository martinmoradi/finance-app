jest.unmock('@/lib/errors');

import { createErrorResponse, mapHttpStatusToErrorCode } from '@/lib/errors';
import { ErrorCode } from '@repo/types';

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
