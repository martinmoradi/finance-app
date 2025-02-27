import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'crypto';

interface RequestContext {
  requestId: string;
}

export class RequestContextStorage {
  private static storage = new AsyncLocalStorage<RequestContext>();
  private static isTestEnvironment = process.env.NODE_ENV === 'test';
  private static defaultTestRequestId = crypto.randomUUID();

  static getRequestId(): string {
    const store = this.storage.getStore();
    if (!store) {
      // In test environment, return a default request ID to avoid errors
      if (this.isTestEnvironment) {
        return this.defaultTestRequestId;
      }
      throw new Error('Request context not found');
    }
    return store.requestId;
  }

  static run(requestId: string, callback: () => void): void {
    return this.storage.run({ requestId }, callback);
  }
}
