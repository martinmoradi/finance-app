import { getAuthHeaders } from '@/features/auth/actions/get-auth-headers';
import { getSession } from '@/features/auth/actions/get-session';
import { refreshTokens } from '@/features/auth/actions/refresh-tokens';
import { createErrorResponse } from '@/lib/errors';
import { ApiResponse, ErrorCode, SessionCookie } from '@repo/types';
import { headers } from 'next/headers';

type ServerActionWithAuth<T, P extends unknown[] = unknown[]> = (
  headers: Record<string, string>,
  session: AuthenticatedSession,
  ...args: P
) => Promise<ApiResponse<T>>;
type AuthenticatedSession = Extract<SessionCookie, { isAuthenticated: true }>;

/**
 * Higher-order function that wraps server actions requiring authentication
 * Always provides authentication headers as the first parameter to the wrapped function
 */
export function withAuth<T, P extends unknown[] = unknown[]>(
  serverAction: ServerActionWithAuth<T, P>,
): (...args: P) => Promise<ApiResponse<T>> {
  return async (...args: P): Promise<ApiResponse<T>> => {
    const requestId =
      (await headers()).get('x-request-id') || crypto.randomUUID();

    try {
      const authHeaders = await getAuthHeaders();

      const session = await getSession();

      if (!session.isAuthenticated) {
        return createErrorResponse(
          ErrorCode.AUTHENTICATION_ERROR,
          'Unauthenticated',
          requestId,
        );
      }

      if (session.isExpired) {
        await refreshTokens();
      }

      return await serverAction(
        authHeaders as Record<string, string>,
        session,
        ...args,
      );
    } catch (error) {
      console.error(`Unexpected error in authenticated server action:`, error);
      return createErrorResponse(
        ErrorCode.SERVER_ERROR,
        'An unexpected error occurred',
        requestId,
        { originalError: error },
      );
    }
  };
}
