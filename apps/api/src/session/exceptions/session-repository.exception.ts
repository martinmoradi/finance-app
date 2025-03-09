export enum SessionRepositoryOperation {
  CREATE = 'create',
  FIND = 'find',
  FIND_ALL = 'findAll',
  DELETE = 'delete',
  UPDATE = 'update',
  CLEANUP = 'cleanup',
  DELETE_ALL = 'deleteAll',
}

export class SessionRepositoryException extends Error {
  public readonly operation: SessionRepositoryOperation;
  public readonly userId: string;
  public readonly deviceId?: string;

  constructor(
    operation: SessionRepositoryOperation,
    userId: string,
    deviceId?: string,
    cause?: Error,
  ) {
    super(
      `Failed to ${operation} session for user ${userId}${
        deviceId ? ` and device ${deviceId}` : ''
      }`,
      {
        cause,
      },
    );
    this.operation = operation;
    this.userId = userId;
    this.deviceId = deviceId;
  }
}
