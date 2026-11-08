import { Request, Response, NextFunction } from 'express';
import { redisClient, isRedisConnected } from '../../config/redis.config';
import { UpgradeRequiredError } from '../errors/appError';

/**
 * Compare two Semantic Version strings (e.g. "2.1.0" and "2.2.0")
 * Returns:
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *   1 if v1 > v2
 */
export const compareSemVer = (v1: string, v2: string): number => {
  const p1 = v1.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const p2 = v2.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);

  const length = Math.max(p1.length, p2.length);
  for (let i = 0; i < length; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
};

// Fallback configuration if Redis key has not been populated
const DEFAULT_VERSION_CONFIG: Record<string, { min: string; latest: string; storeUrl: string }> = {
  android: {
    min: '2.0.0',
    latest: '2.4.0',
    storeUrl: 'https://play.google.com/store/apps/details?id=bd.secride.passenger',
  },
  ios: {
    min: '2.0.0',
    latest: '2.4.0',
    storeUrl: 'https://apps.apple.com/app/secureride-bangladesh/id123456789',
  },
  web: {
    min: '1.0.0',
    latest: '1.0.0',
    storeUrl: 'https://secureride.com.bd',
  },
};

export const versionGate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Bypass health checks and metrics
  if (req.path === '/health' || req.path === '/metrics' || req.path.startsWith('/public')) {
    return next();
  }

  const clientVersion = req.headers['x-app-version'] as string | undefined;
  const platform = ((req.headers['x-platform'] as string) || 'android').toLowerCase();

  // If no app version is provided, proceed (or web/browser clients)
  if (!clientVersion) {
    return next();
  }

  try {
    let minVersion = DEFAULT_VERSION_CONFIG[platform]?.min || '1.0.0';
    let latestVersion = DEFAULT_VERSION_CONFIG[platform]?.latest || '2.4.0';
    const storeUrl = DEFAULT_VERSION_CONFIG[platform]?.storeUrl || 'https://secureride.com.bd';

    // Query Redis if connected
    if (isRedisConnected()) {
      const [redisMin, redisLatest] = await Promise.all([
        redisClient.get(`config:min_supported_version:${platform}`),
        redisClient.get(`config:latest_version:${platform}`),
      ]);

      if (redisMin) minVersion = redisMin;
      if (redisLatest) latestVersion = redisLatest;
    }

    // 1. Hard Forced Update Check (client < min_supported)
    if (compareSemVer(clientVersion, minVersion) < 0) {
      throw new UpgradeRequiredError(clientVersion, minVersion, latestVersion, storeUrl);
    }

    // 2. Soft Update Notification (min <= client < latest)
    if (compareSemVer(clientVersion, latestVersion) < 0) {
      res.setHeader('X-Update-Available', 'true');
      res.setHeader('X-Latest-Version', latestVersion);
    }

    next();
  } catch (error) {
    next(error);
  }
};

