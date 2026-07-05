import type { RequestHandler, Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';

/**
 * Wraps an authenticated async controller: types `req` as AuthenticatedRequest
 * (the authenticate middleware runs first, so req.user exists) and forwards
 * rejections to the global error handler.
 */
export const asAuth =
  (fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    fn(req as AuthenticatedRequest, res).catch(next);
