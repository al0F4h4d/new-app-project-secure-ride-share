import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { versionGate } from '../../src/common/middlewares/versionGate.middleware';
import { errorHandler } from '../../src/common/middlewares/errorHandler.middleware';
import { ErrorCodes } from '../../src/common/constants/errorCodes.constant';

describe('API Version Gate Middleware Integration Test', () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use(versionGate);
  testApp.get('/test-route', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Version allowed' });
  });
  testApp.use(errorHandler);

  it('should return 426 Upgrade Required when client version is below minimum supported version (1.0.0 < 2.0.0)', async () => {
    const res = await request(testApp)
      .get('/test-route')
      .set('X-App-Version', '1.0.0')
      .set('X-Platform', 'android');

    expect(res.status).toBe(426);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe(ErrorCodes.AUTH_APP_UPGRADE_REQUIRED);
    expect(res.body).toHaveProperty('message_bn');
    expect(res.body.data).toMatchObject({
      current_version: '1.0.0',
      minimum_supported_version: '2.0.0',
      force_update: true,
    });
  });

  it('should inject X-Update-Available header when client version is between min and latest (2.1.0)', async () => {
    const res = await request(testApp)
      .get('/test-route')
      .set('X-App-Version', '2.1.0')
      .set('X-Platform', 'android');

    expect(res.status).toBe(200);
    expect(res.headers['x-update-available']).toBe('true');
    expect(res.headers['x-latest-version']).toBe('2.4.0');
    expect(res.body.success).toBe(true);
  });

  it('should allow request cleanly when client version matches latest version (2.4.0)', async () => {
    const res = await request(testApp)
      .get('/test-route')
      .set('X-App-Version', '2.4.0')
      .set('X-Platform', 'android');

    expect(res.status).toBe(200);
    expect(res.headers['x-update-available']).toBeUndefined();
    expect(res.body.success).toBe(true);
  });
});

