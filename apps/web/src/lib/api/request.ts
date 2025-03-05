import {
  createErrorResponse,
  mapHttpStatusToErrorCode,
} from '@/lib/utils/errors';
import { ApiResponse, ErrorCode, RequestOptions } from '@repo/types';

// Core request function
export async function request<T, D = unknown>(
  options: RequestOptions<D> & {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  },
): Promise<ApiResponse<T>> {
  const baseUrl =
    options.baseUrl || process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : `${process.env.NEXT_PUBLIC_API_URL}`;
  const timeoutMs = options.timeoutMs || 10000;

  try {
    // Set up abort controller for timeout
    const controller = new AbortController();
    const signal = options.signal || controller.signal;

    // Set timeout
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    // Prepare request URL
    const url = `${baseUrl}${options.path}`;

    // Prepare request options
    const requestOptions: RequestInit = {
      method: options.method,
      headers,
      signal,
      credentials: 'include', // Include cookies
    };

    // Add body for non-GET requests
    if (options.method !== 'GET' && options.data) {
      requestOptions.body = JSON.stringify(options.data);
    }

    // Execute the request
    const response = await fetch(url, requestOptions);

    // Clear the timeout
    clearTimeout(timeout);

    // Handle HTTP errors
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
        headers: response.headers,
      };
    }

    // Parse and return successful response
    const data = (await response.json()) as T;
    return {
      success: true,
      data,
      headers: response.headers,
    };
  } catch (error) {
    // Handle network and other errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      return createErrorResponse<T>(
        ErrorCode.NETWORK_ERROR,
        'Request timed out',
        { timeout: timeoutMs },
      );
    }

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
  options?: Partial<RequestOptions<unknown>> & {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  },
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
  options?: Partial<RequestOptions<D>> & {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  },
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
  options?: Partial<RequestOptions<D>> & {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  },
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
  options?: Partial<RequestOptions<unknown>> & {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  },
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'DELETE',
    path,
    ...options,
  });
}
