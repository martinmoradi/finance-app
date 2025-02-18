export class SessionCleanupFailedException extends Error {
  constructor(cause?: Error) {
    super('Failed to cleanup expired sessions', { cause });
  }
}
