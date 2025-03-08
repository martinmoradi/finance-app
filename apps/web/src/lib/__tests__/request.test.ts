/**
 * This must be the first import to ensure the mock is set up before any
 * other imports that might use crypto.randomUUID
 */
// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn().mockReturnValue('test-uuid'),
  configurable: true,
});

// Regular imports
import { request, get, post, put, del } from '@/lib/request';
import { createErrorResponse, mapHttpStatusToErrorCode } from '@/lib/errors';
import * as Sentry from '@sentry/nextjs';
import { ErrorCode } from '@repo/types';

// Mock dependencies
jest.mock('@/lib/errors', () => ({
  createErrorResponse: jest
    .fn()
    .mockImplementation((errorCode, message, requestId, details) => ({
      success: false,
      error: {
        code: errorCode,
        message,
        requestId,
        details,
      },
    })),
  mapHttpStatusToErrorCode: jest.fn().mockReturnValue('UNKNOWN_ERROR'),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortController
const mockAbort = jest.fn();
class MockAbortController {
  signal = { aborted: false };
  abort = mockAbort;
}
global.AbortController =
  MockAbortController as unknown as typeof AbortController;

// Save original env
const originalEnv = process.env;

describe('request.ts', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset specific mocks
    mockFetch.mockReset();
    mockAbort.mockReset();
    (global.crypto.randomUUID as jest.Mock).mockReturnValue('test-uuid');

    // Set environment for testing
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_URL: 'https://api.production.com',
    };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('get', () => {
    it('should make a GET request and return successful response', async () => {
      // Mock successful response
      const mockResponseData = { data: 'test data' };
      const mockHeaders = new Headers({
        'Content-Type': 'application/json',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: mockHeaders,
        status: 200,
      });

      // Execute test
      const result = await get('/test');

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.production.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
          }),
          credentials: 'include',
        }),
      );

      // Verify result
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: mockHeaders,
      });
    });
  });

  describe('Basic functionality', () => {
    it('should make a successful request with the correct parameters', async () => {
      // Mock successful response
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test data
      const testPath = '/test';
      const testMethod = 'POST';
      const testData = { name: 'test' };
      const testHeaders = { 'Custom-Header': 'value' };

      // Execute request
      await request({
        path: testPath,
        method: testMethod,
        data: testData,
        headers: testHeaders,
      });

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.production.com/test',
        expect.objectContaining({
          method: testMethod,
          body: JSON.stringify(testData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
            'Custom-Header': 'value',
          }),
          credentials: 'include',
        }),
      );
    });

    it('should use the provided baseUrl when specified', async () => {
      // Mock successful response
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test data with custom baseUrl
      const customBaseUrl = 'https://api.example.com';
      const testPath = '/test-endpoint';
      const expectedUrl = `${customBaseUrl}${testPath}`;

      // Execute request with custom baseUrl
      await request({
        path: testPath,
        method: 'GET',
        baseUrl: customBaseUrl,
      });

      // Verify fetch was called with the custom baseUrl
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it('should use the default baseUrl based on environment when not specified', async () => {
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      const testPath = '/test-endpoint';

      // Test in development environment (which is set in beforeEach)
      await request({
        path: testPath,
        method: 'GET',
      });

      // Verify production baseUrl was used
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.production.com${testPath}`,
        expect.any(Object),
      );

      // Test 2: Development  environment
      // Reset mocks for the second call
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Save current env
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
      };

      // Execute request in development environment
      await request({
        path: testPath,
        method: 'GET',
      });

      // Verify development baseUrl was used
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3001${testPath}`,
        expect.any(Object),
      );
    });

    it('should include the correct default headers', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      // Make a simple request
      await request({
        path: '/test',
        method: 'GET',
      });

      // Verify default headers were included
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
          }),
        }),
      );
    });

    it('should merge custom headers with default headers', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      // Custom headers to add
      const customHeaders = {
        Authorization: 'Bearer token123',
        'Custom-Header': 'custom-value',
        // Override a default header
        'Content-Type': 'application/xml',
      };

      // Make a request with custom headers
      await request({
        path: '/test',
        method: 'GET',
        headers: customHeaders,
      });

      // Verify headers were merged correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            // Custom headers should be present
            Authorization: 'Bearer token123',
            'Custom-Header': 'custom-value',
            // Default headers should be present (except overridden ones)
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
            // Overridden header should have the custom value
            'Content-Type': 'application/xml',
          }),
        }),
      );
    });

    it('should handle the request body correctly for non-GET requests', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      // Test data to send in the request body
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        age: 30,
        preferences: {
          theme: 'dark',
          notifications: true,
        },
      };

      // Make a POST request with data
      await request({
        path: '/users',
        method: 'POST',
        data: testData,
      });

      // Verify the request body was properly JSON stringified
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
        }),
      );

      // Reset mock for next test
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      // Test with PUT method
      await request({
        path: '/users/123',
        method: 'PUT',
        data: testData,
      });

      // Verify the request body was properly included for PUT as well
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData),
        }),
      );
    });

    it('should not include a body for GET requests', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      // Make a GET request with data (which should be ignored)
      await request({
        path: '/users',
        method: 'GET',
        data: { someData: 'value' },
      });

      // Verify the request was called with the correct method
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        }),
      );

      // Verify the request does NOT include a body property
      const fetchCallArgs = mockFetch.mock.calls[0][1];
      expect(fetchCallArgs).not.toHaveProperty('body');
    });
  });

  describe('Response handling', () => {
    it('should parse and return JSON data on successful response', async () => {
      // Mock response data
      const mockResponseData = {
        id: 123,
        name: 'Test User',
        email: 'test@example.com',
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z',
      };

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Make request
      const result = await request({
        path: '/users/123',
        method: 'GET',
      });

      // Verify the response was parsed correctly
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });

    it('should include headers in the successful response', async () => {
      // Create mock headers
      const mockHeaders = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Request-ID': 'response-request-id',
      });

      // Mock successful response with headers
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ id: 123 }),
        headers: mockHeaders,
        status: 200,
      });

      // Make request
      const result = await request<unknown>({
        path: '/users/123',
        method: 'GET',
      });

      // Type assertion to tell TypeScript that result has headers
      const successResult = result as {
        success: true;
        data: unknown;
        headers: Headers;
      };

      // Verify headers are included in the response
      expect(successResult.headers).toBe(mockHeaders);

      // Verify we can access header values from the result
      expect(successResult.headers.get('Content-Type')).toBe(
        'application/json',
      );
      expect(successResult.headers.get('Cache-Control')).toBe('no-cache');
      expect(successResult.headers.get('X-Request-ID')).toBe(
        'response-request-id',
      );
    });

    it('should handle empty responses gracefully', async () => {
      // Mock empty response (e.g., for a 204 No Content)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        // json() would normally throw on empty response
        json: jest.fn().mockResolvedValueOnce(null),
        headers: new Headers(),
        status: 204,
      });

      // Make request
      const result = await request<null>({
        path: '/users/123',
        method: 'DELETE',
      });

      // Type assertion for success case with headers
      const successResult = result as {
        success: true;
        data: null;
        headers: Headers;
      };

      // Verify the response was handled correctly
      expect(successResult).toEqual({
        success: true,
        data: null,
        headers: expect.any(Headers),
      });
    });

    it('should handle non-JSON responses appropriately', async () => {
      // Mock a response where json() throws an error
      const jsonParseError = new Error('Unexpected token');

      // Mock successful response but with JSON parsing error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(jsonParseError),
        headers: new Headers({ 'Content-Type': 'text/plain' }),
        status: 200,
        text: jest.fn().mockResolvedValueOnce('Plain text response'),
      });

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Spy on Sentry.captureException
      const sentrySpy = jest.spyOn(Sentry, 'captureException');

      // Make request
      const result = await request({
        path: '/text-endpoint',
        method: 'GET',
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error in request:',
        jsonParseError,
      );

      // Verify error was captured by Sentry
      expect(sentrySpy).toHaveBeenCalledWith(
        jsonParseError,
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/text-endpoint',
            http_method: 'GET',
          }),
        }),
      );

      // Verify we get an error response
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ErrorCode.NETWORK_ERROR,
          message: 'Unexpected token',
          requestId: 'test-uuid',
        }),
      });

      // Clean up mock
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should handle HTTP error responses with JSON error body', async () => {
      // Mock error response with JSON body
      const errorBody = {
        message: 'Validation failed',
        errors: {
          email: ['Email is invalid'],
          password: ['Password is too short'],
        },
      };

      // Mock HTTP error response (400 Bad Request)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValueOnce(errorBody),
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-Request-ID': 'error-request-id',
        }),
        url: 'https://api.production.com/users',
      });

      // Reset mapHttpStatusToErrorCode mock to return the correct error code
      (mapHttpStatusToErrorCode as jest.Mock).mockReturnValueOnce(
        ErrorCode.VALIDATION_ERROR,
      );

      // Spy on Sentry.captureException
      const sentrySpy = jest.spyOn(Sentry, 'captureException');

      // Make request that will result in error
      const result = await request({
        path: '/users',
        method: 'POST',
        data: { email: 'invalid', password: '123' },
      });

      // Verify mapHttpStatusToErrorCode was called with the correct status
      expect(mapHttpStatusToErrorCode).toHaveBeenCalledWith(400);

      // Verify createErrorResponse was called with the correct parameters
      expect(createErrorResponse).toHaveBeenCalledWith(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        'error-request-id', // Using the request ID from the response headers
        expect.objectContaining({
          originalError: errorBody,
          statusCode: 400,
          url: 'https://api.production.com/users',
          method: 'POST',
        }),
      );

      // Verify error was captured by Sentry
      expect(sentrySpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/users',
            http_method: 'POST',
            status_code: 400,
          }),
          extra: expect.objectContaining({
            request_id: 'test-uuid',
            errorBody,
          }),
        }),
      );

      // Verify the error response structure
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          requestId: 'error-request-id',
          details: expect.objectContaining({
            originalError: errorBody,
            statusCode: 400,
          }),
        }),
      });
    });

    it('should handle HTTP error responses with non-JSON error body', async () => {
      // Mock HTTP error response with non-JSON body (e.g., HTML error page)
      const jsonParseError = new Error(
        'Unexpected token < in JSON at position 0',
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        // Mock json() to throw an error as it would with non-JSON content
        json: jest.fn().mockRejectedValueOnce(jsonParseError),
        headers: new Headers({
          'Content-Type': 'text/html',
          'X-Request-ID': 'error-html-id',
        }),
        url: 'https://api.production.com/error',
        // Add text method to simulate HTML response
        text: jest
          .fn()
          .mockResolvedValueOnce(
            '<html><body><h1>500 Server Error</h1></body></html>',
          ),
      });

      // Reset mapHttpStatusToErrorCode mock to return the correct error code
      (mapHttpStatusToErrorCode as jest.Mock).mockReturnValueOnce(
        ErrorCode.SERVER_ERROR,
      );

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Spy on Sentry.captureException
      const sentrySpy = jest.spyOn(Sentry, 'captureException');

      // Make request that will result in error
      const result = await request({
        path: '/error',
        method: 'GET',
      });

      // Verify mapHttpStatusToErrorCode was called with the correct status
      expect(mapHttpStatusToErrorCode).toHaveBeenCalledWith(500);

      // Verify createErrorResponse was called with the correct parameters
      expect(createErrorResponse).toHaveBeenCalledWith(
        ErrorCode.SERVER_ERROR,
        `Request failed with status 500`,
        'error-html-id',
        expect.objectContaining({
          originalError: {}, // Empty object since JSON parsing failed
          statusCode: 500,
          url: 'https://api.production.com/error',
          method: 'GET',
        }),
      );

      // Verify error was captured by Sentry
      expect(sentrySpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/error',
            http_method: 'GET',
            status_code: 500,
          }),
        }),
      );

      // Verify the error response structure
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ErrorCode.SERVER_ERROR,
          message: `Request failed with status 500`,
          requestId: 'error-html-id',
          details: expect.objectContaining({
            statusCode: 500,
          }),
        }),
      });

      // Clean up mock
      consoleErrorSpy.mockRestore();
    });

    it('should map HTTP status codes to appropriate error codes', async () => {
      // Define test cases for different HTTP status codes
      const testCases = [
        { status: 400, expectedErrorCode: ErrorCode.VALIDATION_ERROR },
        { status: 401, expectedErrorCode: ErrorCode.AUTHENTICATION_ERROR },
        { status: 403, expectedErrorCode: ErrorCode.AUTHORIZATION_ERROR },
        { status: 404, expectedErrorCode: ErrorCode.NOT_FOUND },
        { status: 409, expectedErrorCode: ErrorCode.CONFLICT },
        { status: 500, expectedErrorCode: ErrorCode.SERVER_ERROR },
        { status: 502, expectedErrorCode: ErrorCode.SERVER_ERROR },
        { status: 503, expectedErrorCode: ErrorCode.SERVER_ERROR },
        { status: 418, expectedErrorCode: ErrorCode.UNKNOWN_ERROR }, // I'm a teapot (not explicitly handled)
      ];

      // Test each status code
      for (const testCase of testCases) {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockFetch.mockReset();

        // Mock HTTP error response for this status
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: testCase.status,
          statusText: 'Error',
          json: jest.fn().mockResolvedValueOnce({
            message: `Status ${testCase.status} error`,
          }),
          headers: new Headers({
            'Content-Type': 'application/json',
            'X-Request-ID': `error-id-${testCase.status}`,
          }),
          url: `https://api.production.com/status/${testCase.status}`,
        });

        // Reset mapHttpStatusToErrorCode mock to use the real implementation
        (mapHttpStatusToErrorCode as jest.Mock).mockImplementation((status) => {
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
        });

        // Make request that will result in error
        const result = await request({
          path: `/status/${testCase.status}`,
          method: 'GET',
        });

        // Verify mapHttpStatusToErrorCode was called with the correct status
        expect(mapHttpStatusToErrorCode).toHaveBeenCalledWith(testCase.status);

        // Verify the error response has the expected error code
        expect(result).toEqual({
          success: false,
          error: expect.objectContaining({
            code: testCase.expectedErrorCode,
            requestId: `error-id-${testCase.status}`,
          }),
        });
      }
    });

    it('should include the original error details in the error response', async () => {
      // Mock a detailed error response
      const errorBody = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        validationErrors: {
          email: ['Must be a valid email address'],
          password: ['Must be at least 8 characters', 'Must include a number'],
        },
        timestamp: '2023-06-15T12:34:56Z',
        traceId: 'abc123xyz789',
      };

      // Mock HTTP error response (400 Bad Request)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValueOnce(errorBody),
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-Request-ID': 'validation-error-id',
        }),
        url: 'https://api.production.com/users',
      });

      // Reset mapHttpStatusToErrorCode mock
      (mapHttpStatusToErrorCode as jest.Mock).mockReturnValueOnce(
        ErrorCode.VALIDATION_ERROR,
      );

      // Make request that will result in error
      const result = await request({
        path: '/users',
        method: 'POST',
        data: { email: 'invalid', password: 'weak' },
      });

      // Verify the error response includes all the original error details
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          requestId: 'validation-error-id',
          details: expect.objectContaining({
            // Original error should be preserved exactly as received
            originalError: errorBody,
            // Additional context should be included
            statusCode: 400,
            url: 'https://api.production.com/users',
            method: 'POST',
          }),
        }),
      });

      // Verify we can access nested validation errors from the original error
      const errorResponse = result as {
        success: false;
        error: { details: { originalError: typeof errorBody } };
      };
      expect(
        errorResponse.error.details.originalError.validationErrors.email,
      ).toContain('Must be a valid email address');
      expect(
        errorResponse.error.details.originalError.validationErrors.password,
      ).toContain('Must be at least 8 characters');
      expect(
        errorResponse.error.details.originalError.validationErrors.password,
      ).toContain('Must include a number');
      expect(errorResponse.error.details.originalError.timestamp).toBe(
        '2023-06-15T12:34:56Z',
      );
      expect(errorResponse.error.details.originalError.traceId).toBe(
        'abc123xyz789',
      );
    });

    it('should capture HTTP errors with Sentry including appropriate metadata', async () => {
      // Mock error response
      const errorBody = {
        message: 'Resource not found',
        code: 'NOT_FOUND',
      };

      // Mock HTTP error response (404 Not Found)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValueOnce(errorBody),
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-Request-ID': 'not-found-id',
        }),
        url: 'https://api.production.com/users/999',
      });

      // Reset mapHttpStatusToErrorCode mock
      (mapHttpStatusToErrorCode as jest.Mock).mockReturnValueOnce(
        ErrorCode.NOT_FOUND,
      );

      // Spy on Sentry.captureException
      const sentrySpy = jest.spyOn(Sentry, 'captureException');

      // Make request that will result in error
      await request({
        path: '/users/999',
        method: 'GET',
      });

      // Verify Sentry.captureException was called
      expect(sentrySpy).toHaveBeenCalled();

      // Get the call arguments directly
      const error = sentrySpy.mock.calls[0]![0];
      const metadata = sentrySpy.mock.calls[0]![1];

      // Verify the error is an Error object with appropriate message
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Request API error: 404 404');

      // Verify the metadata contains all expected information
      expect(metadata).toEqual(
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/users/999',
            http_method: 'GET',
            status_code: 404,
          }),
          extra: expect.objectContaining({
            request_id: 'test-uuid',
            errorBody,
            url: 'https://api.production.com/users/999',
          }),
        }),
      );

      // Verify specific metadata fields that are important for debugging
      const metadataObj = metadata as {
        tags: Record<string, string | number>;
        extra: Record<string, unknown>;
      };

      // Check tags
      expect(metadataObj.tags.api_endpoint).toBe('/users/999');
      expect(metadataObj.tags.http_method).toBe('GET');
      expect(metadataObj.tags.status_code).toBe(404);

      // Check extra data
      expect(metadataObj.extra.request_id).toBe('test-uuid');
      expect(metadataObj.extra.errorBody).toEqual(errorBody);
      expect(metadataObj.extra.url).toBe(
        'https://api.production.com/users/999',
      );
    });
    it('should handle network errors correctly', async () => {
      // Create a network error (like connection refused, DNS failure, etc.)
      const networkError = new TypeError('Failed to fetch');

      // Mock fetch to reject with a network error
      mockFetch.mockRejectedValueOnce(networkError);

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Spy on Sentry.captureException
      const sentrySpy = jest.spyOn(Sentry, 'captureException');

      // Make request that will result in network error
      const result = await request({
        path: '/users',
        method: 'GET',
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error in request:',
        networkError,
      );

      // Verify error was captured by Sentry with appropriate metadata
      expect(sentrySpy).toHaveBeenCalledWith(
        networkError,
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/users',
            http_method: 'GET',
            error_type: 'TypeError',
          }),
          extra: expect.objectContaining({
            request_id: 'test-uuid',
            message: 'Unexpected error in API request',
          }),
        }),
      );

      // Verify the error response structure
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ErrorCode.NETWORK_ERROR,
          message: 'Failed to fetch',
          requestId: 'test-uuid',
          details: expect.objectContaining({
            error: networkError,
          }),
        }),
      });

      // Verify createErrorResponse was called with the correct parameters
      expect(createErrorResponse).toHaveBeenCalledWith(
        ErrorCode.NETWORK_ERROR,
        'Failed to fetch',
        'test-uuid',
        { error: networkError },
      );

      // Clean up mock
      consoleErrorSpy.mockRestore();
    });

    it('should handle unexpected errors correctly', async () => {
      // Create an unexpected error that might occur during request processing
      const unexpectedError = new Error('Something went terribly wrong');

      // Mock fetch to initially succeed but then cause an error during processing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        // Make json() throw an unexpected error (not a JSON parse error)
        json: jest.fn().mockImplementation(() => {
          throw unexpectedError;
        }),
        headers: new Headers(),
        status: 200,
      });

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Spy on Sentry.captureException
      const sentrySpy = jest.spyOn(Sentry, 'captureException');

      // Make request that will result in unexpected error
      const result = await request({
        path: '/data',
        method: 'GET',
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error in request:',
        unexpectedError,
      );

      // Verify error was captured by Sentry with appropriate metadata
      expect(sentrySpy).toHaveBeenCalledWith(
        unexpectedError,
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/data',
            http_method: 'GET',
            error_type: 'Error',
          }),
          extra: expect.objectContaining({
            request_id: 'test-uuid',
            message: 'Unexpected error in API request',
          }),
        }),
      );

      // Verify the error response structure
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ErrorCode.NETWORK_ERROR,
          message: 'Something went terribly wrong',
          requestId: 'test-uuid',
          details: expect.objectContaining({
            error: unexpectedError,
          }),
        }),
      });

      // Verify createErrorResponse was called with the correct parameters
      expect(createErrorResponse).toHaveBeenCalledWith(
        ErrorCode.NETWORK_ERROR,
        'Something went terribly wrong',
        'test-uuid',
        { error: unexpectedError },
      );

      // Clean up mock
      consoleErrorSpy.mockRestore();
    });

    it('should capture unexpected errors with Sentry including appropriate metadata', async () => {
      // Create a custom error type to test specific error properties
      class CustomApiError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomApiError';
        }

        // Add a custom property
        customProperty = 'custom value';
      }

      // Create an instance of our custom error
      const customError = new CustomApiError('Custom API processing error');

      // Mock fetch to throw the custom error during response processing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockImplementation(() => {
          throw customError;
        }),
        headers: new Headers({
          'X-Request-ID': 'custom-error-id',
        }),
        status: 200,
      });

      // Spy on Sentry.captureException
      const sentrySpy = jest.spyOn(Sentry, 'captureException');

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Make request with additional context data
      await request({
        path: '/api/complex-data',
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
          'X-Custom-Header': 'custom-value',
        },
      });

      // Verify Sentry.captureException was called
      expect(sentrySpy).toHaveBeenCalled();

      // Get the call arguments directly
      const error = sentrySpy.mock.calls[0]![0];
      const metadata = sentrySpy.mock.calls[0]![1];

      // Verify the error is our custom error
      expect(error).toBe(customError);
      expect((error as CustomApiError).name).toBe('CustomApiError');
      expect((error as CustomApiError).customProperty).toBe('custom value');

      // Verify the metadata contains detailed information for debugging
      expect(metadata).toEqual(
        expect.objectContaining({
          tags: expect.objectContaining({
            api_endpoint: '/api/complex-data',
            http_method: 'GET',
            error_type: 'CustomApiError',
          }),
          extra: expect.objectContaining({
            request_id: 'test-uuid',
            message: 'Unexpected error in API request',
          }),
        }),
      );

      // Verify specific metadata fields that help with debugging
      const metadataObj = metadata as {
        tags: Record<string, string | number>;
        extra: Record<string, unknown>;
      };

      // Check that error type is correctly identified
      expect(metadataObj.tags.error_type).toBe('CustomApiError');

      // Check that the API endpoint is correctly recorded
      expect(metadataObj.tags.api_endpoint).toBe('/api/complex-data');

      // Check that the request ID is included for correlation
      expect(metadataObj.extra.request_id).toBe('test-uuid');

      // Clean up mock
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Timeout handling', () => {
    it('should abort the request after the default timeout period', async () => {
      // Mock the DOMException for AbortError
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );

      // Setup mocks
      jest.useFakeTimers();
      const sentrySpy = jest
        .spyOn(Sentry, 'captureMessage')
        .mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        // Create a fetch mock that will never resolve on its own
        mockFetch.mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            // Store the reject function so we can call it when abort is called
            mockAbort.mockImplementationOnce(() => {
              // Simulate what happens when fetch is aborted
              reject(abortError);
            });
          });
        });

        // Start the request (don't await it yet)
        const requestPromise = request({
          path: '/hanging-endpoint',
          method: 'GET',
        });

        // Verify the initial state
        expect(mockAbort).not.toHaveBeenCalled();

        // Fast-forward past the timeout
        jest.runAllTimers();

        // Now abort should have been called
        expect(mockAbort).toHaveBeenCalled();

        // Now we can await the result
        const result = await requestPromise;

        // Verify the response is an error with the correct code and message
        expect(result).toEqual({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.NETWORK_ERROR,
            message: 'Request timed out',
            requestId: 'test-uuid',
            details: expect.objectContaining({
              timeout: 10000,
            }),
          }),
        });

        // Verify Sentry was called
        expect(sentrySpy).toHaveBeenCalledWith(
          'API request timeout',
          expect.any(Object),
        );
      } finally {
        // Clean up
        jest.useRealTimers();
        sentrySpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    }, 10000); // Add explicit timeout of 10 seconds

    it('should abort the request after the custom timeout period if provided', async () => {
      // Mock the DOMException for AbortError
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );

      // Setup mocks
      jest.useFakeTimers();
      const sentrySpy = jest
        .spyOn(Sentry, 'captureMessage')
        .mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        // Create a fetch mock that will never resolve on its own
        mockFetch.mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            // Store the reject function so we can call it when abort is called
            mockAbort.mockImplementationOnce(() => {
              // Simulate what happens when fetch is aborted
              reject(abortError);
            });
          });
        });

        // Define a custom timeout value (different from the default 10000ms)
        const customTimeoutMs = 5000;

        // Start the request with custom timeout (don't await it yet)
        const requestPromise = request({
          path: '/hanging-endpoint',
          method: 'GET',
          timeoutMs: customTimeoutMs, // Use custom timeout
        });

        // Verify the initial state
        expect(mockAbort).not.toHaveBeenCalled();

        // Advance time but not enough to trigger the timeout
        jest.advanceTimersByTime(customTimeoutMs - 100);

        // Abort should not have been called yet
        expect(mockAbort).not.toHaveBeenCalled();

        // Now advance past the custom timeout
        jest.advanceTimersByTime(200); // Total time: customTimeoutMs + 100ms

        // Now abort should have been called
        expect(mockAbort).toHaveBeenCalled();

        // Now we can await the result
        const result = await requestPromise;

        // Verify the response is an error with the correct code and message
        expect(result).toEqual({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.NETWORK_ERROR,
            message: 'Request timed out',
            requestId: 'test-uuid',
            details: expect.objectContaining({
              timeout: customTimeoutMs, // Should use the custom timeout value
            }),
          }),
        });

        // Verify Sentry was called with the custom timeout value
        expect(sentrySpy).toHaveBeenCalledWith(
          'API request timeout',
          expect.objectContaining({
            extra: expect.objectContaining({
              timeout: customTimeoutMs,
            }),
          }),
        );
      } finally {
        // Clean up
        jest.useRealTimers();
        sentrySpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    }, 10000); // Add explicit timeout of 10 seconds

    it('should return a timeout error when request times out', async () => {
      // Mock the DOMException for AbortError
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );

      // Setup mocks
      jest.useFakeTimers();
      const sentrySpy = jest
        .spyOn(Sentry, 'captureMessage')
        .mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Spy on createErrorResponse to verify it's called with the correct parameters
      const createErrorResponseSpy = jest.spyOn(
        require('@/lib/errors'),
        'createErrorResponse',
      );

      try {
        // Create a fetch mock that will never resolve on its own
        mockFetch.mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            // Store the reject function so we can call it when abort is called
            mockAbort.mockImplementationOnce(() => {
              // Simulate what happens when fetch is aborted
              reject(abortError);
            });
          });
        });

        // Start the request (don't await it yet)
        const requestPromise = request({
          path: '/timeout-test',
          method: 'GET',
        });

        // Fast-forward past the timeout
        jest.runAllTimers();

        // Now we can await the result
        const result = await requestPromise;

        // Verify the response structure
        expect(result.success).toBe(false);

        // Type guard to ensure TypeScript knows we're dealing with an error response
        if (result.success === true) {
          // This should never happen in this test
          fail('Expected an error response but got a success response');
          return;
        }

        // Now TypeScript knows result has an error property
        expect(result.error).toBeDefined();
        expect(result.error.code).toBe(ErrorCode.NETWORK_ERROR);
        expect(result.error.message).toBe('Request timed out');
        expect(result.error.requestId).toBe('test-uuid');
        expect(result.error.details).toEqual(
          expect.objectContaining({
            timeout: 10000,
          }),
        );

        // Verify createErrorResponse was called with the correct parameters
        expect(createErrorResponseSpy).toHaveBeenCalledWith(
          ErrorCode.NETWORK_ERROR,
          'Request timed out',
          'test-uuid',
          expect.objectContaining({
            timeout: 10000,
          }),
        );

        // Additional type checks
        expect(typeof result.error.code).toBe('string');
        expect(typeof result.error.message).toBe('string');
        expect(typeof result.error.requestId).toBe('string');
        expect(typeof result.error.details).toBe('object');
      } finally {
        // Clean up
        jest.useRealTimers();
        sentrySpy.mockRestore();
        consoleErrorSpy.mockRestore();
        createErrorResponseSpy.mockRestore();
      }
    }, 10000); // Add explicit timeout of 10 seconds

    it('should capture timeout errors with Sentry', async () => {
      // Mock the DOMException for AbortError
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );

      // Setup mocks
      jest.useFakeTimers();

      // Create a detailed spy for Sentry.captureMessage to inspect the call arguments
      const sentrySpy = jest
        .spyOn(Sentry, 'captureMessage')
        .mockImplementation();

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        // Create a fetch mock that will never resolve on its own
        mockFetch.mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            // Store the reject function so we can call it when abort is called
            mockAbort.mockImplementationOnce(() => {
              // Simulate what happens when fetch is aborted
              reject(abortError);
            });
          });
        });

        // Define a custom path and timeout for this test
        const testPath = '/api/important-data';
        const testMethod = 'POST';
        const testTimeout = 3000;

        // Start the request with custom timeout (don't await it yet)
        const requestPromise = request({
          path: testPath,
          method: testMethod,
          timeoutMs: testTimeout,
          data: { test: 'data' },
        });

        // Fast-forward past the timeout
        jest.runAllTimers();

        // Wait for the request to complete
        await requestPromise;

        // Verify Sentry.captureMessage was called
        expect(sentrySpy).toHaveBeenCalled();

        // Verify the message and options were correct
        expect(sentrySpy).toHaveBeenCalledWith(
          'API request timeout',
          expect.objectContaining({
            level: 'error',
            tags: expect.objectContaining({
              api_endpoint: testPath,
              http_method: testMethod,
            }),
            extra: expect.objectContaining({
              request_id: 'test-uuid',
              timeout: testTimeout,
            }),
          }),
        );

        // Verify console.error was called with the timeout information
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Request timed out',
          expect.objectContaining({ timeout: testTimeout }),
        );
      } finally {
        // Clean up
        jest.useRealTimers();
        sentrySpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    }, 10000); // Add explicit timeout of 10 seconds

    it('should cleanup timeout when request completes successfully', async () => {
      // Setup mocks
      jest.useFakeTimers();

      // Create a spy for clearTimeout to verify it's called
      const originalClearTimeout = global.clearTimeout;
      const clearTimeoutSpy = jest.fn();
      global.clearTimeout = clearTimeoutSpy;

      try {
        // Mock a successful response
        const mockResponseData = { success: true, data: 'test data' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockResponseData),
          headers: new Headers(),
          status: 200,
        });

        // Make a request
        const result = await request({
          path: '/api/data',
          method: 'GET',
        });

        // Verify the request was successful
        expect(result.success).toBe(true);

        // Type guard to ensure TypeScript knows we're dealing with a success response
        if (result.success === false) {
          // This should never happen in this test
          fail('Expected a success response but got an error response');
          return;
        }

        // Now TypeScript knows result has a data property
        expect(result.data).toEqual(mockResponseData);

        // Verify clearTimeout was called at least once
        // (it should be called to clean up the timeout)
        expect(clearTimeoutSpy).toHaveBeenCalled();

        // The key verification is that we got a successful response,
        // which means the timeout didn't trigger an error
        expect(result.success).toBe(true);

        // Run any pending timers to ensure no side effects
        jest.runAllTimers();

        // Verify we still have a successful result
        expect(result.success).toBe(true);
      } finally {
        // Restore original clearTimeout
        global.clearTimeout = originalClearTimeout;
        jest.useRealTimers();
      }
    }, 10000); // Add explicit timeout of 10 seconds

    it('should cleanup timeout when request fails with error', async () => {
      // Setup mocks
      jest.useFakeTimers();

      // Create a spy for clearTimeout to verify it's called
      const originalClearTimeout = global.clearTimeout;
      const clearTimeoutSpy = jest.fn();
      global.clearTimeout = clearTimeoutSpy;

      // Spy on Sentry.captureException to prevent actual calls
      const sentrySpy = jest
        .spyOn(Sentry, 'captureException')
        .mockImplementation();

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock createErrorResponse to return a specific error response
      const mockErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.SERVER_ERROR,
          message: 'Internal Server Error',
          requestId: 'test-uuid',
          details: {
            statusCode: 500,
            originalError: { message: 'Internal Server Error' },
            url: 'https://api.production.com/error-endpoint',
            method: 'GET',
          },
        },
      };

      (createErrorResponse as jest.Mock).mockReturnValueOnce(mockErrorResponse);

      try {
        // Mock an error response (HTTP error, not a timeout)
        const errorStatus = 500;
        const errorBody = { message: 'Internal Server Error' };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: errorStatus,
          statusText: 'Internal Server Error',
          json: jest.fn().mockResolvedValueOnce(errorBody),
          headers: new Headers(),
          url: 'https://api.production.com/error-endpoint',
        });

        // Make a request
        const result = await request({
          path: '/error-endpoint',
          method: 'GET',
        });

        // Verify the request failed with the expected error
        expect(result).toBeDefined();
        expect(result.success).toBe(false);

        // Type guard to ensure TypeScript knows we're dealing with an error response
        if (result.success === true) {
          // This should never happen in this test
          fail('Expected an error response but got a success response');
          return;
        }

        // Verify the error details
        expect(result.error.code).toBeDefined();
        expect(result.error.message).toBeDefined();

        // Verify clearTimeout was called at least once
        // (it should be called to clean up the timeout)
        expect(clearTimeoutSpy).toHaveBeenCalled();

        // Run any pending timers to ensure no side effects
        jest.runAllTimers();

        // The key verification is that we got an error response that matches
        // the server error, not a timeout error
        expect(result.error.message).not.toBe('Request timed out');

        // Verify that Sentry was called with the correct error
        expect(sentrySpy).toHaveBeenCalled();
      } finally {
        // Restore original functions
        global.clearTimeout = originalClearTimeout;
        jest.useRealTimers();
        sentrySpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('AbortController handling', () => {
    it('should use the provided AbortSignal if one is passed', async () => {
      // Create a real AbortController for proper typing
      const customController = new AbortController();
      const customSignal = customController.signal;

      // Mock successful response
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Make request with custom signal
      await request({
        path: '/test-signal',
        method: 'GET',
        signal: customSignal,
      });

      // Verify fetch was called with the custom signal
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: customSignal,
        }),
      );
    });

    it('should create a new AbortSignal if one is not provided', async () => {
      // Mock successful response
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Make request without providing a signal
      await request({
        path: '/test-default-signal',
        method: 'GET',
      });

      // Verify fetch was called with a signal (the default one created internally)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(Object),
        }),
      );
    });

    it('should handle external aborts correctly', async () => {
      // Create a real AbortController for proper typing
      const customController = new AbortController();
      const customSignal = customController.signal;

      // Mock the DOMException for AbortError
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );

      // Spy on Sentry.captureMessage (not captureException)
      const sentrySpy = jest
        .spyOn(Sentry, 'captureMessage')
        .mockImplementation();

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock createErrorResponse to return a specific error response
      const mockErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: 'Request timed out',
          requestId: 'test-uuid',
          details: {
            timeout: 5000,
          },
        },
      };

      (createErrorResponse as jest.Mock).mockReturnValueOnce(mockErrorResponse);

      // Create a fetch mock that will reject when aborted
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          // Store the reject function so we can call it when abort is called
          mockAbort.mockImplementationOnce(() => {
            // Simulate what happens when fetch is aborted
            reject(abortError);
          });
        });
      });

      try {
        // Start the request with custom signal
        const requestPromise = request({
          path: '/test-external-abort',
          method: 'GET',
          signal: customSignal,
          timeoutMs: 5000, // Use a specific timeout for verification
        });

        // Trigger the external abort
        customController.abort();

        // Now we can await the result
        const result = await requestPromise;

        // Verify the response is an error with the correct code, message, and details
        expect(result).toBeDefined();
        expect(result).toEqual({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.NETWORK_ERROR,
            message: 'Request timed out',
            requestId: 'test-uuid',
            details: expect.objectContaining({
              timeout: 5000,
            }),
          }),
        });

        // Verify Sentry.captureMessage was called with the correct parameters
        expect(sentrySpy).toHaveBeenCalledWith(
          'API request timeout',
          expect.objectContaining({
            level: 'error',
            tags: expect.objectContaining({
              api_endpoint: '/test-external-abort',
              http_method: 'GET',
            }),
            extra: expect.objectContaining({
              request_id: 'test-uuid',
              timeout: 5000,
            }),
          }),
        );

        // Verify console.error was called with the timeout information
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Request timed out',
          expect.objectContaining({
            timeout: 5000,
          }),
        );
      } finally {
        // Clean up mocks
        sentrySpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('Request ID handling', () => {
    it('should use the provided request ID if one is in the headers', async () => {
      // Mock successful response
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Custom request ID to use
      const customRequestId = 'custom-request-id-123';

      // Make request with custom request ID in headers
      await request({
        path: '/test-custom-id',
        method: 'GET',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      // Verify fetch was called with the custom request ID
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-request-id': customRequestId,
          }),
        }),
      );

      // Verify randomUUID was not called (since we provided a request ID)
      expect(global.crypto.randomUUID).not.toHaveBeenCalled();
    });

    it('should generate a random UUID if no request ID is provided', async () => {
      // Reset the randomUUID mock
      (global.crypto.randomUUID as jest.Mock).mockClear();

      // Mock successful response
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Make request without providing a request ID
      await request({
        path: '/test-generated-id',
        method: 'GET',
      });

      // Verify randomUUID was called to generate a request ID
      expect(global.crypto.randomUUID).toHaveBeenCalled();

      // Verify fetch was called with the generated request ID
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-request-id': 'test-uuid', // The mocked return value
          }),
        }),
      );
    });

    it('should include the request ID in error responses', async () => {
      // Mock error response
      const errorBody = { message: 'Not Found' };

      // Create headers with a specific request ID
      const responseHeaders = new Headers({
        'Content-Type': 'application/json',
        'x-request-id': 'error-response-id',
      });

      // Mock createErrorResponse to return a specific error response
      const mockErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Not Found',
          requestId: 'error-response-id',
          details: {
            originalError: errorBody,
            statusCode: 404,
            url: 'https://api.production.com/not-found',
            method: 'GET',
          },
        },
      };

      (createErrorResponse as jest.Mock).mockReturnValueOnce(mockErrorResponse);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValueOnce(errorBody),
        headers: responseHeaders,
        url: 'https://api.production.com/not-found',
      });

      // Reset mapHttpStatusToErrorCode mock
      (mapHttpStatusToErrorCode as jest.Mock).mockReturnValueOnce(
        ErrorCode.NOT_FOUND,
      );

      // Make request
      const result = await request({
        path: '/not-found',
        method: 'GET',
      });

      // Verify the error response includes the request ID from the response headers
      expect(result).toBeDefined();
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ErrorCode.NOT_FOUND,
          requestId: 'error-response-id', // Should use the ID from response headers
        }),
      });

      // Verify createErrorResponse was called with the correct request ID
      expect(createErrorResponse).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'error-response-id',
        expect.any(Object),
      );
    });

    it('should include the request ID in Sentry reports', async () => {
      // Create a network error
      const networkError = new Error('Network failure');

      // Mock fetch to reject with a network error
      mockFetch.mockRejectedValueOnce(networkError);

      // Spy on Sentry.captureException
      const sentrySpy = jest
        .spyOn(Sentry, 'captureException')
        .mockImplementation();

      // Spy on console.error to prevent actual logging during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Custom request ID to use
      const customRequestId = 'sentry-report-id';

      try {
        // Make request with custom request ID
        await request({
          path: '/network-error',
          method: 'GET',
          headers: {
            'x-request-id': customRequestId,
          },
        });
      } catch (error) {
        // Ignore any errors
      }

      // Verify Sentry.captureException was called with the correct request ID
      expect(sentrySpy).toHaveBeenCalledWith(
        networkError,
        expect.objectContaining({
          tags: expect.any(Object),
          extra: expect.objectContaining({
            request_id: customRequestId,
          }),
        }),
      );

      // Clean up mocks
      sentrySpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Convenience functions', () => {
  describe('get function', () => {
    beforeEach(() => {
      // Ensure environment is set correctly for these tests
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.production.com',
      };
    });

    it('should call request with method GET and correct parameters', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { id: 123, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test path
      const testPath = '/test-get-endpoint';

      // Execute get request
      const result = await get(testPath);

      // Verify fetch was called with the correct URL and method
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.production.com${testPath}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
          credentials: 'include',
        }),
      );

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });

    it('should pass through additional options to request', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { id: 456, name: 'Test with Options' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test path and options
      const testPath = '/test-get-with-options';
      const customBaseUrl = 'https://custom-api.example.com';
      const customHeaders = {
        Authorization: 'Bearer test-token',
        'Custom-Header': 'custom-value',
      };

      // Execute get request with options
      const result = await get(testPath, {
        baseUrl: customBaseUrl,
        headers: customHeaders,
        timeoutMs: 5000,
      });

      // Verify fetch was called with the custom baseUrl
      expect(mockFetch).toHaveBeenCalledWith(
        `${customBaseUrl}${testPath}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            // Should include custom headers
            Authorization: 'Bearer test-token',
            'Custom-Header': 'custom-value',
            // Should also include default headers
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
          }),
        }),
      );

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });
  });

  describe('post function', () => {
    beforeEach(() => {
      // Ensure environment is set correctly for these tests
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.production.com',
      };
    });

    it('should call request with method POST and correct parameters', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { id: 789, success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 201,
      });

      // Test path and data
      const testPath = '/api/users';
      const testData = { name: 'Test User', email: 'test@example.com' };

      // Execute post request
      const result = await post(testPath, testData);

      // Verify fetch was called with the correct URL, method, and data
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.production.com${testPath}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
          headers: expect.any(Object),
          credentials: 'include',
        }),
      );

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });

    it('should include the provided data in the request', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { id: 101, message: 'Created' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 201,
      });

      // Test path with complex data object
      const testPath = '/api/items';
      const complexData = {
        item: {
          name: 'Complex Item',
          properties: {
            color: 'blue',
            size: 'medium',
            features: ['waterproof', 'shockproof'],
          },
          price: 99.99,
          active: true,
          metadata: {
            createdBy: 'user123',
            tags: ['premium', 'featured'],
          },
        },
      };

      // Execute post request with complex data
      await post(testPath, complexData);

      // Verify the body was properly JSON stringified
      const fetchCallArgs = mockFetch.mock.calls[0][1];
      expect(fetchCallArgs.body).toBe(JSON.stringify(complexData));

      // Parse the body back to an object to verify data integrity
      const parsedBody = JSON.parse(fetchCallArgs.body);
      expect(parsedBody).toEqual(complexData);

      // Verify nested properties are preserved
      expect(parsedBody.item.properties.features).toEqual([
        'waterproof',
        'shockproof',
      ]);
      expect(parsedBody.item.metadata.tags).toEqual(['premium', 'featured']);
    });

    it('should pass through additional options to request', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { id: 202, status: 'success' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 201,
      });

      // Test path, data and options
      const testPath = '/api/orders';
      const testData = { product: 'Test Product', quantity: 2 };
      const customBaseUrl = 'https://api.staging.example.com';
      const customHeaders = {
        Authorization: 'Bearer post-token',
        'Idempotency-Key': 'unique-operation-id',
      };

      // Execute post request with options
      const result = await post(testPath, testData, {
        baseUrl: customBaseUrl,
        headers: customHeaders,
        timeoutMs: 15000,
      });

      // Verify fetch was called with the custom baseUrl and merged headers
      expect(mockFetch).toHaveBeenCalledWith(
        `${customBaseUrl}${testPath}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
          headers: expect.objectContaining({
            // Should include custom headers
            Authorization: 'Bearer post-token',
            'Idempotency-Key': 'unique-operation-id',
            // Should also include default headers
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
          }),
        }),
      );

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });
  });

  describe('put function', () => {
    beforeEach(() => {
      // Ensure environment is set correctly for these tests
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.production.com',
      };
    });

    it('should call request with method PUT and correct parameters', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { id: 456, updated: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test path and data
      const testPath = '/api/users/456';
      const testData = { name: 'Updated User', email: 'updated@example.com' };

      // Execute put request
      const result = await put(testPath, testData);

      // Verify fetch was called with the correct URL, method, and data
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.production.com${testPath}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData),
          headers: expect.any(Object),
          credentials: 'include',
        }),
      );

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });

    it('should include the provided data in the request', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { id: 789, updated: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test path and data
      const testPath = '/api/products/789';
      const testData = {
        product: {
          name: 'Updated Product',
          description: 'New description',
          price: 129.99,
          available: true,
          variants: [
            { color: 'red', size: 'S', sku: 'PR-RED-S' },
            { color: 'blue', size: 'M', sku: 'PR-BLUE-M' },
          ],
        },
      };

      // Execute put request
      await put(testPath, testData);

      // Verify the body was properly JSON stringified
      const fetchCallArgs = mockFetch.mock.calls[0][1];
      expect(fetchCallArgs.body).toBe(JSON.stringify(testData));

      // Parse the body back and verify complex data structures
      const parsedBody = JSON.parse(fetchCallArgs.body);
      expect(parsedBody).toEqual(testData);
      expect(parsedBody.product.variants).toHaveLength(2);
      expect(parsedBody.product.variants[0].sku).toBe('PR-RED-S');
    });

    it('should pass through additional options to request', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { success: true, message: 'Resource updated' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test path, data and options
      const testPath = '/api/settings';
      const testData = { theme: 'dark', notifications: true };
      const customBaseUrl = 'https://admin-api.example.org';
      const customHeaders = {
        Authorization: 'Bearer put-update-token',
        'X-Tracking-ID': 'update-operation-123',
      };

      // Execute put request with options
      const result = await put(testPath, testData, {
        baseUrl: customBaseUrl,
        headers: customHeaders,
        timeoutMs: 20000,
      });

      // Verify fetch was called with the custom baseUrl and merged headers
      expect(mockFetch).toHaveBeenCalledWith(
        `${customBaseUrl}${testPath}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData),
          headers: expect.objectContaining({
            // Should include custom headers
            Authorization: 'Bearer put-update-token',
            'X-Tracking-ID': 'update-operation-123',
            // Should also include default headers
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
          }),
        }),
      );

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });
  });

  describe('del function', () => {
    beforeEach(() => {
      // Ensure environment is set correctly for these tests
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.production.com',
      };
    });

    it('should call request with method DELETE and correct parameters', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response (often empty for DELETE)
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 204, // No Content is common for DELETE
      });

      // Test path
      const testPath = '/api/users/123';

      // Execute delete request
      const result = await del(testPath);

      // Verify fetch was called with the correct URL and method
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.production.com${testPath}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.any(Object),
          credentials: 'include',
        }),
      );

      // Verify no body is included in the request (DELETE typically has no body)
      const fetchCallArgs = mockFetch.mock.calls[0][1];
      expect(fetchCallArgs).not.toHaveProperty('body');

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });

    it('should pass through additional options to request', async () => {
      // Reset mockFetch for this test
      mockFetch.mockReset();

      // Mock successful response
      const mockResponseData = { message: 'Resource deleted' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponseData),
        headers: new Headers(),
        status: 200,
      });

      // Test path and options
      const testPath = '/api/posts/456';
      const customBaseUrl = 'https://content-api.example.io';
      const customHeaders = {
        Authorization: 'Bearer delete-token',
        'X-Reason': 'requested-by-user',
      };

      // Execute delete request with options
      const result = await del(testPath, {
        baseUrl: customBaseUrl,
        headers: customHeaders,
        timeoutMs: 7500,
      });

      // Verify fetch was called with the custom baseUrl and merged headers
      expect(mockFetch).toHaveBeenCalledWith(
        `${customBaseUrl}${testPath}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            // Should include custom headers
            Authorization: 'Bearer delete-token',
            'X-Reason': 'requested-by-user',
            // Should also include default headers
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-request-id': 'test-uuid',
          }),
        }),
      );

      // Verify the response structure
      expect(result).toEqual({
        success: true,
        data: mockResponseData,
        headers: expect.any(Headers),
      });
    });
  });
});
