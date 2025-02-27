export class SessionLimitExceededException extends Error {
  constructor(userId: string, cause?: Error) {
    super(`Session limit exceeded for user ${userId}`, { cause });
  }
}
