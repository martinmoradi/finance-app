import { RequestContextStorage } from '@/middleware/request-context.storage';
import { RequestIdMiddleware } from '@/middleware/request-id.middleware';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

// Mock the crypto module
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
}));

// Mock the RequestContextStorage module
jest.mock('@/middleware/request-context.storage', () => ({
  RequestContextStorage: {
    run: jest.fn().mockImplementation((requestId, callback) => {
      callback();
    }),
  },
}));

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should generate a new request ID if none is provided', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'mocked-uuid',
    );
    expect(RequestContextStorage.run).toHaveBeenCalledWith(
      'mocked-uuid',
      expect.any(Function),
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use the provided request ID from headers', () => {
    mockRequest.headers = { 'x-request-id': 'existing-request-id' };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(crypto.randomUUID).not.toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'existing-request-id',
    );
    expect(RequestContextStorage.run).toHaveBeenCalledWith(
      'existing-request-id',
      expect.any(Function),
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should ensure next() is called within the RequestContextStorage.run callback', () => {
    let callbackExecuted = false;

    // Override the mock implementation for this test
    (RequestContextStorage.run as jest.Mock).mockImplementationOnce(
      (requestId, callback) => {
        callbackExecuted = true;
        callback();
      },
    );

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(RequestContextStorage.run).toHaveBeenCalled();
    expect(callbackExecuted).toBeTruthy();
    expect(mockNext).toHaveBeenCalled();
  });
});
