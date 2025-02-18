export class SessionRepositoryException extends Error {
  constructor(
    operation: string,
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
  }
}
