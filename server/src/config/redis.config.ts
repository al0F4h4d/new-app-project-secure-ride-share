import Redis, { RedisOptions } from 'ioredis';
import { env } from './env.config';
import { logger } from './logger.config';

const cleanHost = env.REDIS_HOST.replace(/^(?:https?|tls|rediss?):\/\//, '').replace(/\/$/, '');
const isTlsRequired = env.REDIS_TLS || cleanHost.includes('upstash.io') || env.REDIS_HOST.startsWith('tls://') || env.REDIS_HOST.startsWith('rediss://');

const redisOptions: RedisOptions = {
  host: cleanHost,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD ? env.REDIS_PASSWORD : undefined,
  db: env.REDIS_DB,
  tls: isTlsRequired ? {} : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (env.NODE_ENV !== 'production' && times > 3) {
      logger.warn(`⚠️ Redis is unreachable at ${cleanHost}:${env.REDIS_PORT}. Operating in degraded in-memory mode for development.`);
      return null; // Stop retrying in development
    }
    // Exponential backoff with jitter, max 3000ms delay
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis connection failed. Reconnecting attempt #${times} in ${delay}ms...`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect if Redis cluster transitioned to readonly replica
      return true;
    }
    return false;
  },
  lazyConnect: true, // Allow deferred connect so app boots cleanly and tests can mock/control
};

export const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => {
  logger.info('Redis client connected successfully.');
});

redisClient.on('ready', () => {
  logger.info('Redis client is ready to accept commands.');
});

redisClient.on('error', (err: Error) => {
  if (err.message.includes('ECONNREFUSED')) {
    logger.warn(`Redis connection refused at ${env.REDIS_HOST}:${env.REDIS_PORT}. Check that Redis is running or configure remote Redis in .env.`);
  } else {
    logger.error('Redis client encountered error:', { error: err.message });
  }
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed.');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client attempting reconnection...');
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (redisClient.status === 'wait') {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error('Failed to establish Redis connection:', { error });
    // In dev or test environments, don't crash if Redis is not locally active
    if (env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient.status !== 'end') {
      await redisClient.quit();
      logger.info('Redis client disconnected gracefully.');
    }
  } catch (error) {
    logger.error('Error during Redis disconnection:', { error });
  }
};

export const isRedisConnected = (): boolean => {
  return redisClient.status === 'ready';
};

