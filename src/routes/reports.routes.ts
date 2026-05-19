import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { sendOk } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import type { User, SleepLog } from '../generated/prisma/client.js';

const router = Router();

// All report routes require authentication
router.use(requireAuth);

/**
 * GET /api/core/reports/summary
 * Returns aggregated sleep statistics for the user.
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
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

    if (logs.length === 0) {
      return sendOk(res, {
        stats: {
          averageQuality: 0,
          averageDurationHrs: 0,
          totalRecords: 0,
          streak: 0,
          qualityDistribution: [0, 0, 0, 0, 0],
          weeklyData: []
        }
      });
    }

    const totalRecords = logs.length;
    
    // Average Quality
    const sumQuality = logs.reduce((acc: number, log: SleepLog) => acc + log.quality, 0);
    const averageQuality = Number((sumQuality / totalRecords).toFixed(1));

    // Average Duration
    let totalDurationMs = 0;
    logs.forEach((log: SleepLog) => {
      const duration = new Date(log.wakeTime).getTime() - new Date(log.sleepTime).getTime();
      if (duration > 0) {
        totalDurationMs += duration;
      }
    });
    const averageDurationHrs = Number((totalDurationMs / totalRecords / (1000 * 60 * 60)).toFixed(1));

    // Streak Calculation
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const logDates = logs.map((l: SleepLog) => {
      const d = new Date(l.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
    
    const uniqueDates = Array.from(new Set(logDates)).sort((a, b) => b - a);
    
    if (uniqueDates.length > 0) {
      const oneDayMs = 24 * 60 * 60 * 1000;
      let currentCheck = uniqueDates[0] as number;
      const diffFromToday = today.getTime() - currentCheck;
      
      if (diffFromToday <= oneDayMs) {
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const nextDate = uniqueDates[i] as number;
          if (currentCheck - nextDate === oneDayMs) {
            streak++;
            currentCheck = nextDate;
          } else {
            break;
          }
        }
      }
    }

    // Quality Distribution
    const qualityDistribution = [0, 0, 0, 0, 0];
    logs.forEach(log => {
      if (log.quality >= 1 && log.quality <= 5) {
        qualityDistribution[log.quality - 1]++;
      }
    });

    // Last 7 Days Data for Chart
    const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const match = logs.find(l => {
        const ld = new Date(l.date);
        ld.setHours(0, 0, 0, 0);
        return ld.getTime() === d.getTime();
      });

      const durationHrs = match
        ? (new Date(match.wakeTime).getTime() - new Date(match.sleepTime).getTime()) / (1000 * 60 * 60)
        : 0;

      weeklyData.push({
        day: DAYS_SHORT[d.getDay()],
        hrs: Number(durationHrs.toFixed(1)),
        quality: match?.quality ?? 0,
        isToday: i === 0
      });
    }

    sendOk(res, {
      stats: {
        averageQuality,
        averageDurationHrs,
        totalRecords,
        streak,
        qualityDistribution,
        weeklyData
      }
    });
  } catch (err) {
    next(err);
  }
});

export { router as reportsRouter };
