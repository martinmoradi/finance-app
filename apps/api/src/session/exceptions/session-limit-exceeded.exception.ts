export class SessionLimitExceededException extends Error {
  constructor(userId: string) {
    super(`Session limit exceeded for user ${userId}`);
  }
}
