import { Router } from 'express';
import { sleepRouter } from './sleep.routes.js';
import { reportsRouter } from './reports.routes.js';

const router = Router();

// Nest sleep and reports under the core router
router.use('/sleep', sleepRouter);
router.use('/reports', reportsRouter);

export { router as coreRouter };
