import { afterAll, jest } from '@jest/globals';
import { disconnectDatabase } from '../src/config/database.config';
import { disconnectRedis } from '../src/config/redis.config';

// 60-second default timeout for all test hooks & remote cloud connections
jest.setTimeout(60000);

// Global Teardown hook for all Jest test suites
afterAll(async () => {
  await disconnectDatabase();
  await disconnectRedis();
});

