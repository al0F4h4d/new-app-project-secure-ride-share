import { Request, Response, NextFunction } from 'express';
import { redisClient, isRedisConnected } from '../../config/redis.config';
import { RateLimitError } from '../errors/appError';

interface RateLimiterOptions {
  windowSeconds?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

// In-memory fallback if Redis is unavailable
const memoryBucket = new Map<string, { count: number; resetAt: number }>();

export const createRateLimiter = (options: RateLimiterOptions = {}) => {
  const windowSeconds = options.windowSeconds || 60;
  const maxRequests = options.maxRequests || 100;
  const keyPrefix = options.keyPrefix || 'rl:global:';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Determine client identifier (User ID if authenticated, else IP)
    const clientIdentifier = (req as Request & { user?: { userId: string } }).user?.userId ||
      req.ip ||
      req.socket.remoteAddress ||
      'anonymous';

    const key = `${keyPrefix}${clientIdentifier}`;

    try {
      if (isRedisConnected()) {
        const pipeline = redisClient.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();

        const currentRequests = results?.[0]?.[1] as number;
        const ttl = results?.[1]?.[1] as number;

        // If key was just created, set expiration
        if (ttl === -1) {
          await redisClient.expire(key, windowSeconds);
        }

        const remaining = Math.max(0, maxRequests - currentRequests);
        const resetSeconds = ttl > 0 ? ttl : windowSeconds;

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetSeconds);

        if (currentRequests > maxRequests) {
          res.setHeader('Retry-After', resetSeconds);
          throw new RateLimitError(resetSeconds);
        }
      } else {
        // In-memory fallback logic
        const now = Date.now();
        const record = memoryBucket.get(key);

        if (!record || now > record.resetAt) {
          memoryBucket.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
          res.setHeader('X-RateLimit-Limit', maxRequests);
          res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
          res.setHeader('X-RateLimit-Reset', windowSeconds);
        } else {
          record.count += 1;
          const remaining = Math.max(0, maxRequests - record.count);
          const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

          res.setHeader('X-RateLimit-Limit', maxRequests);
          res.setHeader('X-RateLimit-Remaining', remaining);
          res.setHeader('X-RateLimit-Reset', resetSeconds);

          if (record.count > maxRequests) {
            res.setHeader('Retry-After', resetSeconds);
            throw new RateLimitError(resetSeconds);
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const globalRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 300,
  keyPrefix: 'rl:global:',
});

