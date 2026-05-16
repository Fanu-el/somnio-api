import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env synchronously at config time — before any test module is imported.
const parsed = config().parsed ?? {};

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      ...parsed,
    },
    setupFiles: ['tests/setup/test-env.ts'],
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Run all test files sequentially in a single process.
    // Required because integration tests share a DB — parallel workers cause race conditions.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
