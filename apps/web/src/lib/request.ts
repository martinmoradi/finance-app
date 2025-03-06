import { createErrorResponse, mapHttpStatusToErrorCode } from '@/lib/errors';
import { ApiResponse, ErrorCode, RequestOptions } from '@repo/types';

// Core request function
export async function request<T, D = unknown>(
  options: RequestOptions<D>,
): Promise<ApiResponse<T>> {
  const baseUrl =
    options.baseUrl || process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : `${process.env.NEXT_PUBLIC_API_URL}`;
  const timeoutMs = options.timeoutMs || 10000;

  try {
    // 1. Set up abort controller for timeout
    const controller = new AbortController();
    const signal = options.signal || controller.signal;

    // 2. Set timeout
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // 3. Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    // 4. Prepare request URL
    const url = `${baseUrl}${options.path}`;

    // 5. Prepare request options
    const requestOptions: RequestInit = {
      method: options.method,
      headers,
      signal,
      credentials: 'include', // Include cookies
    };

    // 6. Add body for non-GET requests
    if (options.method !== 'GET' && options.data) {
      requestOptions.body = JSON.stringify(options.data);
    }

    // 7. Execute the request
    const response = await fetch(url, requestOptions);

    // 8. Clear the timeout
    clearTimeout(timeout);

    // 9. Handle HTTP errors
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: mapHttpStatusToErrorCode(response.status),
          message:
            errorBody.message ||
            `Request failed with status ${response.status}`,
          details: errorBody,
        },
      };
    }

    // 10. Parse and return successful response
    const data = (await response.json()) as T;
    return {
      success: true,
      data,
      headers: response.headers,
    };
  } catch (error) {
    // Handle network and other errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Request timed out', { timeout: timeoutMs });
      return createErrorResponse<T>(
        ErrorCode.NETWORK_ERROR,
        'Request timed out',
        { timeout: timeoutMs },
      );
    }

    // Handle unexpected errors
    console.error('Unexpected error in request:', error);
    return createErrorResponse<T>(
      ErrorCode.NETWORK_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
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
