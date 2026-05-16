import type { NextFunction, Request, Response } from 'express';
import { passport } from '../config/passport.js';
import type { User } from '../generated/prisma/client.js';
import { sendError } from '../utils/response.js';
import { StatusCode } from '../constants/status-codes.js';
import { Messages } from '../constants/messages.js';

/**
 * Requires a valid JWT Bearer token.
 * Attaches the authenticated record to req.user on success.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: unknown, user: Express.User | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (!user) {
        const message = info?.message ?? Messages.auth.UNAUTHORIZED;
        sendError(res, message, StatusCode.UNAUTHORIZED);
        return;
      }
      req.user = user;
      next();
    },
  )(req, res, next);
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as User | undefined;
    if (!user || !roles.includes(user.role)) {
      sendError(res, Messages.auth.FORBIDDEN, StatusCode.FORBIDDEN);
      return;
    }
    next();
  };
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user as User | undefined;
  if (!user || user.role !== 'SUPER_ADMIN') {
    sendError(res, Messages.auth.FORBIDDEN, StatusCode.FORBIDDEN);
    return;
  }
  next();
};
