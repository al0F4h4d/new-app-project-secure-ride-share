import express, { Request, Response, NextFunction } from 'express';
import process from 'node:process';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config/env.config';
import { logger } from './config/logger.config';
import { isDatabaseConnected } from './config/database.config';
import { isRedisConnected } from './config/redis.config';
import { errorHandler } from './common/middlewares/errorHandler.middleware';
import { versionGate } from './common/middlewares/versionGate.middleware';
import { globalRateLimiter } from './common/middlewares/rateLimiter.middleware';
import { NotFoundError } from './common/errors/appError';
import { authRoutes } from './modules/auth/auth.routes';

export const createApp = (): express.Application => {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS Configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile apps, postman, and curl (where origin is undefined)
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked request from origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-App-Version',
        'X-Platform',
        'X-Device-Id',
        'X-Request-Id',
        'X-Correlation-Id',
      ],
      exposedHeaders: [
        'X-Update-Available',
        'X-Latest-Version',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After',
      ],
    })
  );

  // 3. Request Parsers (10MB limit for base64 telemetry & audio segments)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 4. Request ID & Correlation ID Tracking Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string) || `req_${uuidv4().replace(/-/g, '')}`;
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    logger.debug(`[${requestId}] Incoming ${req.method} request to ${req.originalUrl}`);
    next();
  });

  // 5. Global API Version Gating
  app.use(versionGate);

  // 6. Global Rate Limiting
  app.use(globalRateLimiter);

  // 7. Health Check Route (Bypasses Auth & Version Gate)
  app.get('/health', (_req: Request, res: Response) => {
    const dbStatus = isDatabaseConnected() ? 'connected' : 'disconnected';
    const redisStatus = isRedisConnected() ? 'connected' : 'disconnected';

    res.status(200).json({
      status: 'ok',
      database: dbStatus,
      redis: redisStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // 8. Domain API Routes
  app.use('/api/v1/auth', authRoutes);

  // 9. Catch Unmatched Routes (404 Not Found)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(undefined, `Cannot ${req.method} ${req.originalUrl}`));
  });

  // 10. Centralized RFC 7807 Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();

