import type { RequestHandler, Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';

/**
 * Wraps an authenticated async controller method so that:
 *  - `req` is typed as AuthenticatedRequest — `req.user` is guaranteed because
 *    the `authenticate` middleware always runs before these routes, and
 *  - any rejected promise is forwarded to Express's global error handler via
 *    `next()` instead of crashing the request.
 */
export const asAuth =
  (fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    fn(req as AuthenticatedRequest, res).catch(next);
