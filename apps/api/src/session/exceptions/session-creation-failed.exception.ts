export class SessionCreationFailedException extends Error {
  constructor(cause?: Error) {
    super('Failed to create new session', { cause });
  }
}
