import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { sendError, sendOk, sendCreated } from '../utils/response.js';
import { StatusCode } from '../constants/status-codes.js';
import { Messages } from '../constants/messages.js';
import { UserStatus, VerificationCodeType } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/user-emails.js';
import { requireAuth } from '../middleware/auth.js';
import type { User } from '../generated/prisma/client.js';
import type { AuthActivity } from '../types/user.types.js';
import { formatTimeRemaining } from '../utils/time-format.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOGIN_ATTEMPTS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, refreshToken, ...safe } = user;
  return safe;
}

function getActivity(user: User): AuthActivity {
  return (user.authActivity as AuthActivity | null) ?? {
    loginAttempts: 0,
    loginDisableCount: 0,
    lastLoggedInAt: null,
    loginDisableWillResetOn: null,
    loginHistory: [],
  };
}

/** Signs both tokens, persists hashed refresh token, returns the pair. */
async function issueTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });
  const hashed = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashed } });
  return { accessToken, refreshToken };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, joinDevice } = req.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      joinDevice?: unknown;
    };

    if (!email || !password || !firstName || !lastName) {
      sendError(res, Messages.validation.REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      sendError(res, Messages.validation.INVALID_EMAIL, StatusCode.BAD_REQUEST);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      sendError(res, Messages.validation.PASSWORD_TOO_SHORT, StatusCode.BAD_REQUEST);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const message = existing.status === UserStatus.PENDING
        ? Messages.auth.ACCOUNT_PENDING_VERIFICATION
        : Messages.auth.EMAIL_TAKEN;
      sendError(res, message, StatusCode.CONFLICT);
      return;
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName,
        lastName,
        role: 'DREAMER',
        status: UserStatus.PENDING,
        joinDetails: {
          joinedAt: new Date().toISOString(),
          joinDevice: joinDevice ?? null,
        },
      },
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + env.verificationCodeExpiresInMinutes * 60 * 1000);
    const verificationCode = await prisma.verificationCode.create({
      data: { code, type: VerificationCodeType.EMAIL_VERIFICATION, userId: user.id, expiresAt },
    });

    try {
      await sendVerificationEmail(user.email, user.firstName, code, env.verificationCodeExpiresInMinutes);
    } catch {
      await prisma.verificationCode.delete({ where: { id: verificationCode.id } });
      await prisma.user.delete({ where: { id: user.id } });
      sendError(res, 'Failed to send verification email. Please try again.', StatusCode.INTERNAL_SERVER_ERROR);
      return;
    }

    sendCreated(res, {
      message: `A verification code has been sent to ${user.email}.`,
      user: { email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/verify-email ─────────────────────────────────────────────

router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      sendError(res, 'email and code are required.', StatusCode.BAD_REQUEST);
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      sendError(res, Messages.auth.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);
      return;
    }
    if (user.status !== UserStatus.PENDING) {
      sendError(res, 'Account is already verified.', StatusCode.BAD_REQUEST);
      return;
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        type: VerificationCodeType.EMAIL_VERIFICATION,
        usedAt: null,
        expiresAt: { gt: new Date() },
        code,
      },
    });

    if (!record) {
      sendError(res, 'Invalid or expired verification code.', StatusCode.BAD_REQUEST);
      return;
    }

    await prisma.$transaction([
      prisma.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.ACTIVE } }),
    ]);

    sendOk(res, { message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/resend-verification ──────────────────────────────────────

router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      sendError(res, 'email is required.', StatusCode.BAD_REQUEST);
      return;
    }

    const genericResponse = { message: 'If that account exists and is pending, a new code has been sent.' };
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.status !== UserStatus.PENDING) {
      sendOk(res, genericResponse);
      return;
    }

    // Rate limiting: Check for recent verification codes
    const recentCodes = await prisma.verificationCode.findMany({
      where: {
        userId: user.id,
        type: VerificationCodeType.EMAIL_VERIFICATION,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check if there's a valid unexpired code created in the last cooldown period
    const lastCode = recentCodes[0];
    if (lastCode) {
      const timeSinceLastCode = Date.now() - lastCode.createdAt.getTime();
      const cooldownSeconds = env.rateLimiting.resendVerificationCooldownMinutes * 60;

      if (timeSinceLastCode < cooldownSeconds * 1000) {
        const remainingSeconds = Math.ceil((cooldownSeconds * 1000 - timeSinceLastCode) / 1000);
        sendError(
          res,
          `Please wait ${formatTimeRemaining(remainingSeconds)} before requesting another code.`,
          StatusCode.TOO_MANY_REQUESTS,
          { retryAfter: remainingSeconds },
        );
        return;
      }
    }

    // Check max attempts per hour
    if (recentCodes.length >= env.rateLimiting.resendVerificationMaxPerHour) {
      sendError(
        res,
        'Too many verification code requests. Please try again later.',
        StatusCode.TOO_MANY_REQUESTS,
        { retryAfter: 3600 }, // 1 hour
      );
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + env.verificationCodeExpiresInMinutes * 60 * 1000);

    await prisma.verificationCode.create({
      data: { code, type: VerificationCodeType.EMAIL_VERIFICATION, userId: user.id, expiresAt },
    });

    sendVerificationEmail(user.email, user.firstName, code, env.verificationCodeExpiresInMinutes)
      .catch((err) => console.error('Failed to resend verification email:', err));

    sendOk(res, genericResponse);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email) {
      sendError(res, 'email is required to log in.', StatusCode.BAD_REQUEST);
      return;
    }
    if (!password) {
      sendError(res, Messages.validation.REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      sendError(res, Messages.auth.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);
      return;
    }
    if (user.status === UserStatus.PENDING) {
      sendError(res, Messages.auth.ACCOUNT_PENDING_VERIFICATION, StatusCode.UNAUTHORIZED);
      return;
    }
    if (user.status === UserStatus.BANNED) {
      sendError(res, Messages.auth.ACCOUNT_BANNED, StatusCode.UNAUTHORIZED);
      return;
    }
    if (user.status === UserStatus.DELETED) {
      sendError(res, Messages.auth.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);
      return;
    }

    // Check if login is temporarily disabled
    if (user.status === UserStatus.TEMPORARILY_LOGIN_DISABLED) {
      const activity = getActivity(user);
      const resetOn = activity.loginDisableWillResetOn ? new Date(activity.loginDisableWillResetOn) : null;

      if (resetOn && new Date() < resetOn) {
        sendError(res, Messages.auth.LOGIN_TEMPORARILY_DISABLED, StatusCode.UNAUTHORIZED, {
          loginDisableWillResetOn: activity.loginDisableWillResetOn,
        });
        return;
      }

      // Disable period has passed — restore to ACTIVE and reset
      await prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          authActivity: { ...activity, loginAttempts: 0, loginDisableWillResetOn: null } as unknown as Prisma.InputJsonValue,
        },
      });
      user.status = UserStatus.ACTIVE;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const activity = getActivity(user);
      const newAttempts = activity.loginAttempts + 1;
      const shouldDisable = newAttempts > MAX_LOGIN_ATTEMPTS;
      const resetOn = shouldDisable
        ? new Date(Date.now() + env.loginDisableDurationMinutes * 60 * 1000).toISOString()
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(shouldDisable ? { status: UserStatus.TEMPORARILY_LOGIN_DISABLED } : {}),
          authActivity: {
            ...activity,
            loginAttempts: newAttempts,
            loginDisableCount: shouldDisable ? activity.loginDisableCount + 1 : activity.loginDisableCount,
            loginDisableWillResetOn: resetOn,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      if (shouldDisable) {
        sendError(res, Messages.auth.LOGIN_TEMPORARILY_DISABLED, StatusCode.UNAUTHORIZED, {
          loginDisableWillResetOn: resetOn,
        });
        return;
      }

      sendError(res, Messages.auth.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED, {
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - newAttempts,
      });
      return;
    }

    // Successful login — re-fetch to get latest authActivity after any failed-attempt updates
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const activity = getActivity(fresh);
    const now = new Date().toISOString();
    const device = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
    const ipAddress = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? null;

    const loginHistory = [{ loginAt: now, loginFrom: { device, ipAddress } }, ...activity.loginHistory].slice(0, 20);
    const updatedActivity: AuthActivity = {
      loginAttempts: 0,
      loginDisableCount: activity.loginDisableCount,
      lastLoggedInAt: now,
      loginDisableWillResetOn: null,
      loginHistory,
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { authActivity: updatedActivity as unknown as Prisma.InputJsonValue },
    });

    const tokens = await issueTokens(user);
    sendOk(res, { ...tokens, user: sanitizeUser({ ...fresh, authActivity: updatedActivity as unknown as Prisma.JsonValue }) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      sendError(res, Messages.auth.INVALID_REFRESH_TOKEN, StatusCode.UNAUTHORIZED);
      return;
    }

    const result = verifyRefreshToken(refreshToken);
    if (!result.ok) {
      const message = result.reason === 'expired'
        ? Messages.auth.EXPIRED_REFRESH_TOKEN
        : Messages.auth.INVALID_REFRESH_TOKEN;
      sendError(res, message, StatusCode.UNAUTHORIZED);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: result.payload.sub } });

    if (!user || user.status !== UserStatus.ACTIVE || !user.refreshToken) {
      sendError(res, Messages.auth.INVALID_REFRESH_TOKEN, StatusCode.UNAUTHORIZED);
      return;
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      sendError(res, Messages.auth.INVALID_REFRESH_TOKEN, StatusCode.UNAUTHORIZED);
      return;
    }

    const tokens = await issueTokens(user);
    sendOk(res, tokens);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: (req.user as User).id },
      data: { refreshToken: null },
    });
    sendOk(res, { message: Messages.auth.LOGGED_OUT });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req.user as User).id },
      include: { profilePictureFile: true },
    });

    sendOk(res, { user: user ? sanitizeUser(user) : null });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      sendError(res, 'email is required.', StatusCode.BAD_REQUEST);
      return;
    }

    const genericResponse = { message: 'If an account with that email exists, a reset code has been sent.' };
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.status === UserStatus.DELETED || user.status === UserStatus.BANNED) {
      sendOk(res, genericResponse);
      return;
    }

    // Rate limiting: Check for recent password reset codes
    const recentCodes = await prisma.verificationCode.findMany({
      where: {
        userId: user.id,
        type: VerificationCodeType.PASSWORD_RESET,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check if there's a code created in the last cooldown period
    const lastCode = recentCodes[0];
    if (lastCode) {
      const timeSinceLastCode = Date.now() - lastCode.createdAt.getTime();
      const cooldownSeconds = env.rateLimiting.resendPasswordResetCooldownMinutes * 60;

      if (timeSinceLastCode < cooldownSeconds * 1000) {
        const remainingSeconds = Math.ceil((cooldownSeconds * 1000 - timeSinceLastCode) / 1000);
        sendError(
          res,
          `Please wait ${formatTimeRemaining(remainingSeconds)} before requesting another reset code.`,
          StatusCode.TOO_MANY_REQUESTS,
          { retryAfter: remainingSeconds },
        );
        return;
      }
    }

    // Check max attempts per hour
    if (recentCodes.length >= env.rateLimiting.resendPasswordResetMaxPerHour) {
      sendError(
        res,
        'Too many password reset requests. Please try again later.',
        StatusCode.TOO_MANY_REQUESTS,
        { retryAfter: 3600 }, // 1 hour
      );
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + env.passwordResetCodeExpiresInMinutes * 60 * 1000);

    await prisma.verificationCode.create({
      data: { code, type: VerificationCodeType.PASSWORD_RESET, userId: user.id, expiresAt },
    });

    sendPasswordResetEmail(user.email, user.firstName, code, env.passwordResetCodeExpiresInMinutes)
      .catch((err) => console.error('Failed to send password reset email:', err));

    sendOk(res, genericResponse);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      sendError(res, 'email, code, and newPassword are required.', StatusCode.BAD_REQUEST);
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      sendError(res, Messages.validation.PASSWORD_TOO_SHORT, StatusCode.BAD_REQUEST);
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status === UserStatus.DELETED) {
      sendError(res, Messages.auth.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);
      return;
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        type: VerificationCodeType.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
        code,
      },
    });

    if (!record) {
      sendError(res, 'Invalid or expired reset code.', StatusCode.BAD_REQUEST);
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { password: hashed, refreshToken: null } }),
    ]);

    sendOk(res, { message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
