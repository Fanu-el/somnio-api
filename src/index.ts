import { app } from './app.js';
import { env } from './config/env.js';

const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  const server = app.listen(env.port, () => {
    console.log(`somnio-api listening on port ${env.port}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error(`Failed to start somnio-api on port ${env.port}.`, error.message);
  });
}

export default app;
