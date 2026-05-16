import type { Response } from 'express';
import { StatusCode } from '../constants/status-codes.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuccessResponse<T> {
  is_error: false;
  status_code: number;
  data: T;
}

interface ErrorResponse {
  is_error: true;
  status_code: number;
  data: null;
  error: { message: string; [key: string]: unknown };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sendSuccess<T>(res: Response, data: T, statusCode: number = StatusCode.OK): void {
  const body: SuccessResponse<T> = { is_error: false, status_code: statusCode, data };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = StatusCode.INTERNAL_SERVER_ERROR,
  extra?: Record<string, unknown>,
): void {
  const body: ErrorResponse = {
    is_error: true,
    status_code: statusCode,
    data: null,
    error: { message, ...extra },
  };
  res.status(statusCode).json(body);
}

export const sendOk = <T>(res: Response, data: T) =>
  sendSuccess(res, data, StatusCode.OK);

export const sendCreated = <T>(res: Response, data: T) =>
  sendSuccess(res, data, StatusCode.CREATED);

/**
 * Standard shape for findMany responses.
 * data: { [key]: [...], total: n }
 */
export const sendList = <T>(res: Response, key: string, items: T[]) =>
  sendSuccess(res, { [key]: items, total: items.length }, StatusCode.OK);
