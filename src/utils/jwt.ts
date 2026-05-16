import jwt, { type SignOptions } from 'jsonwebtoken';
const { TokenExpiredError } = jwt;
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string; // record id
  role: string;
}

// ─── Verify result — discriminated union ─────────────────────────────────────

export type JwtVerifyResult<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: 'expired' | 'invalid' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds SignOptions without optional keys — satisfies exactOptionalPropertyTypes. */
function makeOptions(expiresIn: string): SignOptions {
  const opts: SignOptions = {};
  (opts as Record<string, unknown>)['expiresIn'] = expiresIn;
  return opts;
}

// ─── Access token (short-lived) ───────────────────────────────────────────────

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, makeOptions(env.jwtExpiresIn));
}

/** Throws — used by passport's jwt strategy which handles errors internally. */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

// ─── Refresh token (long-lived) ───────────────────────────────────────────────

export function signRefreshToken(payload: Pick<JwtPayload, 'sub'>): string {
  return jwt.sign(payload, env.jwtRefreshSecret, makeOptions(env.jwtRefreshExpiresIn));
}

/**
 * Returns a typed result instead of throwing so callers can distinguish
 * between an expired token and a completely invalid one.
 */
export function verifyRefreshToken(token: string): JwtVerifyResult<Pick<JwtPayload, 'sub'>> {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret) as Pick<JwtPayload, 'sub'>;
    return { ok: true, payload };
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return { ok: false, reason: 'expired' };
    }
    return { ok: false, reason: 'invalid' };
  }
}

// Backward-compat aliases
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;
