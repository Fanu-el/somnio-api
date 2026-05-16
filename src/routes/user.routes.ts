import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { uploadProfilePic } from '../uploads/profile-pic.upload.js';
import { sendError, sendOk, sendList } from '../utils/response.js';
import { StatusCode } from '../constants/status-codes.js';
import { Messages } from '../constants/messages.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { UserStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { User } from '../generated/prisma/client.js';
import type { BanDetails } from '../types/user.types.js';
import { sendBanNotificationEmail, sendUnbanNotificationEmail } from '../services/user-emails.js';
import { generateDeletedEmail } from '../utils/user-deletion.js';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, refreshToken, ...safe } = user;
  return safe;
}

function getParamId(req: Request, res: Response): string | null {
  const id = req.params['id'];
  if (typeof id !== 'string' || !id) {
    sendError(res, Messages.general.USER_NOT_FOUND, StatusCode.NOT_FOUND);
    return null;
  }
  return id;
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
// SUPER_ADMIN only.

router.get('/', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role   = typeof req.query['role']   === 'string' ? req.query['role']   : undefined;
    const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as User['role'] } : {}),
        ...(search
          ? {
              OR: [
                { email:     { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName:  { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        status: status ? { equals: status as User['status'] } : { not: UserStatus.DELETED },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendList(res, 'users', users.map(sanitizeUser));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
// SUPER_ADMIN only — VIBERs use GET /api/auth/me instead.

router.get('/:id', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParamId(req, res);
    if (!id) return;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.status === UserStatus.DELETED) {
      sendError(res, Messages.general.USER_NOT_FOUND, StatusCode.NOT_FOUND);
      return;
    }

    sendOk(res, { user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/users/update-profile ─────────────────────────────────────────
// Authenticated user only. Updates firstName and/or lastName.

router.patch('/update-profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as User).id;
    const { firstName, lastName } = req.body as { firstName?: string; lastName?: string };

    if (!firstName && !lastName) {
      sendError(res, Messages.general.NO_FIELDS_TO_UPDATE, StatusCode.BAD_REQUEST);
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName  ? { lastName  } : {}),
      },
    });

    sendOk(res, { user: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/users/update-profile-picture ─────────────────────────────────
// Authenticated user only. Form-data field: "file" (JPEG/PNG, max 5MB).

router.patch(
  '/update-profile-picture',
  (req: Request, res: Response, next: NextFunction) => {
    uploadProfilePic(req, res, (err) => {
      if (err) { sendError(res, err.message, StatusCode.BAD_REQUEST); return; }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as User).id;

      if (!req.file) {
        sendError(res, 'No file uploaded. Send an image in the "file" field.', StatusCode.BAD_REQUEST);
        return;
      }

      const filePath = `/uploads/users/profile-pics/${req.file.filename}`;

      const file = await prisma.file.create({
        data: { path: filePath, mimeType: req.file.mimetype, size: req.file.size },
      });

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { profilePictureFileId: file.id },
        include: { profilePictureFile: true },
      });

      sendOk(res, { user: sanitizeUser(updated) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/users/:id/status ─────────────────────────────────────────────
// SUPER_ADMIN only.

router.patch(
  '/:id/status',
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req, res);
      if (!id) return;

      const { status, banReason } = req.body as { status?: string; banReason?: string };
      const validStatuses: UserStatus[] = [UserStatus.ACTIVE, UserStatus.BANNED, UserStatus.DELETED];

      if (!status || !validStatuses.includes(status as UserStatus)) {
        sendError(res, `status must be one of: ${validStatuses.join(', ')}.`, StatusCode.BAD_REQUEST);
        return;
      }

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.status === UserStatus.DELETED) {
        sendError(res, Messages.general.USER_NOT_FOUND, StatusCode.NOT_FOUND);
        return;
      }
      if (target.status === (status as UserStatus)) {
        sendError(res, `User status is already ${status}.`, StatusCode.BAD_REQUEST);
        return;
      }

      const existingBanDetails = (target.banDetails as BanDetails | null) ?? {
        lastBannedAt: null, lastBannedReason: null, banHistory: [],
      };

      const banDetailsUpdate: BanDetails | undefined = status === UserStatus.BANNED
        ? {
            lastBannedAt: new Date().toISOString(),
            lastBannedReason: banReason ?? null,
            banHistory: [
              {
                bannedAt: new Date().toISOString(),
                banReason: banReason ?? '',
                bannerUserId: (req.user as User).id,
              },
              ...existingBanDetails.banHistory,
            ],
          }
        : undefined;

      const revokeToken = status !== UserStatus.ACTIVE;
      
      // Anonymize email if deleting
      const emailUpdate = status === UserStatus.DELETED 
        ? { email: generateDeletedEmail(target.id) }
        : {};

      const updated = await prisma.user.update({
        where: { id },
        data: {
          status: status as UserStatus,
          deletedAt: status === UserStatus.DELETED ? new Date() : null,
          ...emailUpdate,
          ...(revokeToken ? { refreshToken: null } : {}),
          ...(banDetailsUpdate ? { banDetails: banDetailsUpdate as unknown as Prisma.InputJsonValue } : {}),
        },
      });

      sendOk(res, { user: sanitizeUser(updated) });

      // Fire-and-forget email notifications
      if (status === UserStatus.BANNED) {
        sendBanNotificationEmail(target.email, target.firstName, banReason ?? null)
          .catch((err) => console.error('Failed to send ban notification email:', err));
      } else if (status === UserStatus.ACTIVE && target.status === UserStatus.BANNED) {
        sendUnbanNotificationEmail(target.email, target.firstName)
          .catch((err) => console.error('Failed to send unban notification email:', err));
      }
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
// SUPER_ADMIN only. Soft-delete with email anonymization.

router.delete(
  '/:id',
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req, res);
      if (!id) return;

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.status === UserStatus.DELETED) {
        sendError(res, Messages.general.USER_NOT_FOUND, StatusCode.NOT_FOUND);
        return;
      }

      await prisma.user.update({
        where: { id },
        data: { 
          status: UserStatus.DELETED, 
          email: generateDeletedEmail(target.id),
          deletedAt: new Date(), 
          refreshToken: null,
        },
      });

      sendOk(res, { message: 'User deleted.' });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/users/delete-account ────────────────────────────────────────
// Authenticated user can delete their own account.
// Requires password confirmation for security.

router.delete('/delete-account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as User).id;
    const { password } = req.body as { password?: string };

    if (!password) {
      sendError(res, 'Password confirmation is required to delete your account.', StatusCode.BAD_REQUEST);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      sendError(res, Messages.general.USER_NOT_FOUND, StatusCode.NOT_FOUND);
      return;
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      sendError(res, 'Incorrect password.', StatusCode.UNAUTHORIZED);
      return;
    }

    // Soft delete with email anonymization
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.DELETED,
        email: generateDeletedEmail(user.id),
        deletedAt: new Date(),
        refreshToken: null,
      },
    });

    sendOk(res, { 
      message: 'Your account has been deleted. You can create a new account with the same email if you wish.',
    });
  } catch (err) {
    next(err);
  }
});

export { router as userRouter };
