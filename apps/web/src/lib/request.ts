import { createErrorResponse, mapHttpStatusToErrorCode } from '@/lib/errors';
import { ApiResponse, ErrorCode, RequestOptions } from '@repo/types';
import * as Sentry from '@sentry/nextjs';

// Core request function
export async function request<T, D = unknown>(
  options: RequestOptions<D>,
): Promise<ApiResponse<T>> {
  const baseUrl =
    options.baseUrl ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : `${process.env.NEXT_PUBLIC_API_URL}`);
  const timeoutMs = options.timeoutMs || 10000;

  const requestId = options.headers?.['x-request-id'] || crypto.randomUUID();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-request-id': requestId,
    ...options.headers,
  };

  // 1. Set up abort controller for timeout
  const controller = new AbortController();
  const signal = options.signal || controller.signal;

  // 2. Set timeout
  let timeout: NodeJS.Timeout | null = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // 3. Prepare request URL
    const url = `${baseUrl}${options.path}`;

    // 4. Prepare request options
    const requestOptions: RequestInit = {
      method: options.method,
      headers,
      signal,
      credentials: 'include', // Include cookies
    };

    // 5. Add body for non-GET requests
    if (options.method !== 'GET' && options.data) {
      requestOptions.body = JSON.stringify(options.data);
    }

    // 6. Execute the request
    const response = await fetch(url, requestOptions);

    // 7. Clear the timeout
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    // 8. Handle HTTP errors
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as Error;
      const errorCode = mapHttpStatusToErrorCode(response.status);
      const responseRequestId =
        response.headers.get('x-request-id') || requestId;

      Sentry.captureException(
        new Error(`Request API error: ${response.status} ${response.status}`),
        {
          tags: {
            api_endpoint: options.path,
            http_method: options.method,
            status_code: response.status,
          },
          extra: {
            request_id: requestId,
            errorBody,
            url: response.url,
          },
        },
      );

      return createErrorResponse(
        errorCode,
        errorBody.message || `Request failed with status ${response.status}`,
        responseRequestId,
        {
          originalError: errorBody,
          statusCode: response.status,
          url: response.url,
          method: options.method,
        },
      );
    }

    // 9. Parse and return successful response
    const data = (await response.json()) as T;
    return {
      success: true,
      data,
      headers: response.headers,
    };
  } catch (error) {
    // 10. Clear the timeout if it's still active
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    // 11. Handle network and other errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      // 12. Handle abort errors (including timeouts)
      const timeoutDetails = { timeout: timeoutMs };

      Sentry.captureMessage('API request timeout', {
        level: 'error',
        tags: {
          api_endpoint: options.path,
          http_method: options.method,
        },
        extra: {
          request_id: requestId,
          timeout: timeoutMs,
        },
      });

      console.error('Request timed out', timeoutDetails);

      return createErrorResponse(
        ErrorCode.NETWORK_ERROR,
        'Request timed out',
        requestId,
        timeoutDetails,
      );
    }

    // 13. Handle unexpected errors
    console.error('Unexpected error in request:', error);
    Sentry.captureException(error, {
      tags: {
        api_endpoint: options.path,
        http_method: options.method,
        error_type:
          error instanceof Error ? error.name : 'unexpected_request_error',
      },
      extra: {
        request_id: requestId,
        message: 'Unexpected error in API request',
      },
    });

    return createErrorResponse(
      ErrorCode.NETWORK_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
      requestId,
      { error },
    );
  }
}

// Convenience functions
export function get<T>(
  path: string,
  options?: Partial<RequestOptions<unknown>>,
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'GET',
    path,
    ...options,
  });
}

export function post<T, D = unknown>(
  path: string,
  data: D,
  options?: Partial<RequestOptions<D>>,
): Promise<ApiResponse<T>> {
  return request<T, D>({
    method: 'POST',
    path,
    data,
    ...options,
  });
}

export function put<T, D = unknown>(
  path: string,
  data: D,
  options?: Partial<RequestOptions<D>>,
): Promise<ApiResponse<T>> {
  return request<T, D>({
    method: 'PUT',
    path,
    data,
    ...options,
  });
}

export function del<T>(
  path: string,
  options?: Partial<RequestOptions<unknown>>,
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'DELETE',
    path,
    ...options,
  });
}
