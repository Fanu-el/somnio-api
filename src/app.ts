import cors from 'cors';
import express from 'express';
import path from 'path';

import { passport } from './config/passport.js';
import { requestLogger } from './middleware/request-logger.js';
import { healthRouter } from './routes/health.routes.js';
import { testRouter } from './routes/test.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { coreRouter } from './routes/core.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(requestLogger);

// Serve uploaded files — e.g. GET /uploads/profile-pics/abc123.jpg
app.use('/uploads', express.static(path.resolve('uploads')));

app.use('/', healthRouter);
app.use('/api/health', healthRouter);
app.use('/health', healthRouter);
app.use('/api/test', testRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/core', coreRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
