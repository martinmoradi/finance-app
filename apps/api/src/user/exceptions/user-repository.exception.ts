export class UserRepositoryException extends Error {
  constructor(operation: string, email: string, cause?: Error) {
    super(`Failed to ${operation} user ${email}`, {
      cause,
    });
  }
}
