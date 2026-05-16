import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/response.js';
import { StatusCode } from '../constants/status-codes.js';
import { Messages } from '../constants/messages.js';

export const notFoundHandler = (_req: Request, res: Response) => {
  sendError(res, Messages.general.NOT_FOUND, StatusCode.NOT_FOUND);
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const message = error instanceof Error ? error.message : Messages.general.SERVER_ERROR;
  sendError(res, message, StatusCode.INTERNAL_SERVER_ERROR);
};
