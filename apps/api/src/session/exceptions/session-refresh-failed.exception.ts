export class SessionRefreshFailedException extends Error {
  constructor(cause?: Error) {
    super('Failed to refresh session', { cause });
  }
}
