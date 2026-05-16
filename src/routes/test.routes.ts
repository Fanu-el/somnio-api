import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendList, sendOk, sendCreated, sendError } from '../utils/response.js';
import { StatusCode } from '../constants/status-codes.js';

const router = Router();

// GET /api/test — list all test items (excluding soft-deleted)
router.get('/', async (_req: Request, res: Response) => {
  const items = await prisma.test.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  sendList(res, 'items', items);
});

// GET /api/test/:id — get a single test item
router.get('/:id', async (req: Request, res: Response) => {
  const item = await prisma.test.findFirst({
    where: { id: req.params.id as string, deletedAt: null },
  });
  if (!item) {
    sendError(res, 'Test item not found.', StatusCode.NOT_FOUND);
    return;
  }
  sendOk(res, item);
});

// POST /api/test — create a test item
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) {
    sendError(res, 'name is required.', StatusCode.BAD_REQUEST);
    return;
  }
  const item = await prisma.test.create({ data: { name } });
  sendCreated(res, item);
});

// DELETE /api/test/:id — soft-delete a test item
router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.test.findFirst({
    where: { id: req.params.id as string, deletedAt: null },
  });
  if (!existing) {
    sendError(res, 'Test item not found.', StatusCode.NOT_FOUND);
    return;
  }
  await prisma.test.update({
    where: { id: req.params.id as string },
    data: { deletedAt: new Date() },
  });
  sendOk(res, { message: 'Deleted successfully.' });
});

export { router as testRouter };
