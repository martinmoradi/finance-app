export class EnforceSessionLimitException extends Error {
  constructor(userId: string, cause?: Error) {
    super(`Failed to enforce session limit for user ${userId}`, { cause });
  }
}
