import { RequestContextStorage } from '@/middleware/request-context.storage';
import { Injectable, NestMiddleware } from '@nestjs/common';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Generate a request ID if it doesn't exist
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();

    // 2. Add to the response headers
    res.setHeader('x-request-id', requestId);

    // 3. Add to the request context
    RequestContextStorage.run(requestId as string, () => {
      next();
    });
  }
}
