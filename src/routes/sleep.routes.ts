import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { sendOk, sendError, sendList } from '../utils/response.js';
import { StatusCode } from '../constants/status-codes.js';
import { requireAuth } from '../middleware/auth.js';
import type { User } from '../generated/prisma/client.js';

const router = Router();

// All sleep routes require authentication
router.use(requireAuth);

/**
 * GET /api/sleep
 * Fetch all sleep logs for the authenticated user.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as User).id;
    
    const logs = await prisma.sleepLog.findMany({
      where: { 
        userId,
        deletedAt: null 
      },
      orderBy: { 
        date: 'desc' 
      },
    });

    sendList(res, 'logs', logs);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sleep/sync
 * Sync multiple sleep logs. Uses upsert to create or update logs by ID.
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as User).id;
    const { logs } = req.body as { logs: any[] };

    if (!Array.isArray(logs)) {
      sendError(res, 'Payload must contain a "logs" array.', StatusCode.BAD_REQUEST);
      return;
    }

    const results = await Promise.all(
      logs.map((log) => {
        // Ensure we have an ID to upsert on. If not, Prisma will fail.
        // The mobile app provides a random string ID.
        if (!log.id) return null;

        return prisma.sleepLog.upsert({
          where: { id: log.id },
          update: {
            date: new Date(log.date),
            sleepTime: new Date(log.sleepTime),
            wakeTime: new Date(log.wakeTime),
            timezone: log.timezone || 'UTC',
            quality: Number(log.quality),
            dreams: log.dreams || null,
            emoji: log.emoji || null,
          },
          create: {
            id: log.id,
            userId,
            date: new Date(log.date),
            sleepTime: new Date(log.sleepTime),
            wakeTime: new Date(log.wakeTime),
            timezone: log.timezone || 'UTC',
            quality: Number(log.quality),
            dreams: log.dreams || null,
            emoji: log.emoji || null,
          },
        });
      })
    );

    const filteredResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

    sendOk(res, { 
      syncedCount: filteredResults.length,
      message: `Successfully synced ${filteredResults.length} logs.` 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/sleep/:id
 * Soft delete a sleep log.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as User).id;
    const id = req.params['id'] as string;

    if (!id) {
      sendError(res, 'Log ID is required.', StatusCode.BAD_REQUEST);
      return;
    }

    const log = await prisma.sleepLog.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!log) {
      sendError(res, 'Sleep log not found.', StatusCode.NOT_FOUND);
      return;
    }

    await prisma.sleepLog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendOk(res, { message: 'Sleep log deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export { router as sleepRouter };
