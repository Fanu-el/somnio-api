import type { Request, Response, NextFunction } from 'express';

const RESET  = '\x1b[0m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const WHITE  = '\x1b[37m';

function colorStatus(status: number): string {
  if (status < 300) return `${GREEN}${status}${RESET}`;
  if (status < 400) return `${YELLOW}${status}${RESET}`;
  return `${RED}${status}${RESET}`;
}

function colorMethod(method: string): string {
  const colors: Record<string, string> = {
    GET:    `${GREEN}${method}${RESET}`,
    POST:   `${CYAN}${method}${RESET}`,
    PATCH:  `${YELLOW}${method}${RESET}`,
    PUT:    `${YELLOW}${method}${RESET}`,
    DELETE: `${RED}${method}${RESET}`,
  };
  return colors[method] ?? `${WHITE}${method}${RESET}`;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Intercept res.json to capture the response body
  const originalJson = res.json.bind(res) as typeof res.json;
  let responseBody: unknown;

  res.json = function (body?: unknown) {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status   = res.statusCode;
    const method   = colorMethod(req.method);
    const url      = `${BOLD}${req.originalUrl}${RESET}`;
    const code     = colorStatus(status);
    const ms       = `${DIM}${duration}ms${RESET}`;
    const ts       = `${DIM}${new Date().toISOString()}${RESET}`;

    console.log(`${ts}  ${method} ${url}  →  ${code}  ${ms}`);

    // Log request body (skip for GET/HEAD, redact sensitive fields)
    if (req.body && Object.keys(req.body as object).length > 0 && !['GET', 'HEAD'].includes(req.method)) {
      const sanitized = sanitizeBody(req.body as Record<string, unknown>);
      console.log(`  ${DIM}req  ${JSON.stringify(sanitized)}${RESET}`);
    }

    // Log response body (only on errors or non-2xx)
    if (status >= 400 && responseBody !== undefined) {
      console.log(`  ${DIM}res  ${JSON.stringify(responseBody)}${RESET}`);
    }
  });

  next();
}

/** Redacts sensitive fields from logged request bodies. */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const REDACTED = '[REDACTED]';
  const sensitiveKeys = new Set(['password', 'refreshToken', 'accessToken', 'token']);
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, sensitiveKeys.has(k) ? REDACTED : v]),
  );
}
