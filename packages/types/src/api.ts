export type ApiResponse<T> =
  | { success: true; data: T; headers?: Headers }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        validationErrors?: Record<string, string[]>;
        details?: unknown;
      };
    };

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions<T> {
  method: HttpMethod;
  path: string;
  data?: T;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipCsrfCheck?: boolean;
  baseUrl?: string;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CSRF_ERROR = 'CSRF_ERROR',
}
