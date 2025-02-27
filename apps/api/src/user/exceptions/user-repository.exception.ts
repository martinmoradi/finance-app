export enum UserRepositoryOperation {
  FIND = 'find',
  CREATE = 'create',
  DELETE = 'delete',
}

export class UserRepositoryException extends Error {
  public readonly operation: UserRepositoryOperation;
  public readonly identifier: string;

  constructor(
    operation: UserRepositoryOperation,
    identifier: string,
    cause?: Error,
  ) {
    super(`Failed to ${operation} user ${identifier}`, {
      cause,
    });

    this.operation = operation;
    this.identifier = identifier;
  }
}
