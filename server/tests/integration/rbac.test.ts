import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { requireRole } from '../../src/common/middlewares/role.middleware';
import { deviceGuard } from '../../src/common/middlewares/deviceGuard.middleware';
import { errorHandler } from '../../src/common/middlewares/errorHandler.middleware';
import { signAccessToken } from '../../src/common/utils/jwt.util';
import { authenticate } from '../../src/common/middlewares/auth.middleware';
import { UserRoles, AdminSubRoles } from '../../src/common/constants/roles.constant';
import { DeviceBlacklist } from '../../src/models/deviceBlacklist.model';
import { BanTypes } from '../../src/common/constants/roles.constant';
import { connectDatabase, disconnectDatabase } from '../../src/config/database.config';
import { connectRedis, disconnectRedis } from '../../src/config/redis.config';

describe('RBAC & DeviceGuard Middleware Integration Test', () => {
  const testApp = express();
  testApp.use(express.json());

  // Passenger-only endpoint
  testApp.get('/passenger-only', authenticate, requireRole([UserRoles.PASSENGER]), (_req: Request, res: Response) => {
    res.json({ message: 'Welcome Passenger' });
  });

  // Driver-only endpoint
  testApp.get('/driver-only', authenticate, requireRole([UserRoles.DRIVER]), (_req: Request, res: Response) => {
    res.json({ message: 'Welcome Driver' });
  });

  // Admin Ops & Safety endpoint (Super admin also has access)
  testApp.get(
    '/admin/safety-desk',
    authenticate,
    requireRole([UserRoles.ADMIN], [AdminSubRoles.SAFETY]),
    (_req: Request, res: Response) => {
      res.json({ message: 'Welcome Safety Desk' });
    }
  );

  // Device-guarded endpoint
  testApp.post('/device-check', deviceGuard, (_req: Request, res: Response) => {
    res.json({ message: 'Device Clean' });
  });

  testApp.use(errorHandler);

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
  });

  afterAll(async () => {
    await DeviceBlacklist.deleteMany({ imei_hash: 'banned_test_imei_123' });
    await disconnectDatabase();
    await disconnectRedis();
  });

  it('should block unauthenticated requests with 401', async () => {
    const res = await request(testApp).get('/passenger-only');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should allow passenger token on passenger route', async () => {
    const token = signAccessToken({
      userId: '67223a10e4b011e4c8d50001',
      role: UserRoles.PASSENGER,
    });

    const res = await request(testApp)
      .get('/passenger-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Welcome Passenger');
  });

  it('should block driver token on passenger route with 403 AUTH_FORBIDDEN_ROLE', async () => {
    const token = signAccessToken({
      userId: '67223a10e4b011e4c8d50002',
      role: UserRoles.DRIVER,
    });

    const res = await request(testApp)
      .get('/passenger-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AUTH_FORBIDDEN_ROLE');
  });

  it('should enforce admin sub-roles (allow safety admin, block ops admin)', async () => {
    const safetyAdminToken = signAccessToken({
      userId: '67223a10e4b011e4c8d50003',
      role: UserRoles.ADMIN,
      admin_sub_role: AdminSubRoles.SAFETY,
    });

    const opsAdminToken = signAccessToken({
      userId: '67223a10e4b011e4c8d50004',
      role: UserRoles.ADMIN,
      admin_sub_role: AdminSubRoles.OPS,
    });

    const superAdminToken = signAccessToken({
      userId: '67223a10e4b011e4c8d50005',
      role: UserRoles.ADMIN,
      admin_sub_role: AdminSubRoles.SUPER,
    });

    // Safety admin -> 200
    const safetyRes = await request(testApp)
      .get('/admin/safety-desk')
      .set('Authorization', `Bearer ${safetyAdminToken}`);
    expect(safetyRes.status).toBe(200);

    // Super admin -> 200 (Universal access)
    const superRes = await request(testApp)
      .get('/admin/safety-desk')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(superRes.status).toBe(200);

    // Ops admin -> 403 Forbidden
    const opsRes = await request(testApp)
      .get('/admin/safety-desk')
      .set('Authorization', `Bearer ${opsAdminToken}`);
    expect(opsRes.status).toBe(403);
    expect(opsRes.body.errorCode).toBe('AUTH_FORBIDDEN_ROLE');
  });

  it('should block blacklisted device with 403 AUTH_DEVICE_BANNED', async () => {
    await DeviceBlacklist.create({
      imei_hash: 'banned_test_imei_123',
      android_id: 'banned_test_android_id_123',
      nid_hash: 'nid_hash_sample',
      license_hash: 'license_hash_sample',
      facial_vector_hash: 'face_hash_sample',
      integrity_verdict: 'MEETS_DEVICE_INTEGRITY',
      ban_type: BanTypes.KYC_FRAUD,
      ban_reason: '3-strike repeated document forgery',
    });

    const blockedRes = await request(testApp)
      .post('/device-check')
      .set('x-imei-hash', 'banned_test_imei_123');

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.errorCode).toBe('AUTH_DEVICE_BANNED');

    const cleanRes = await request(testApp)
      .post('/device-check')
      .set('x-imei-hash', 'clean_imei_hash_789');

    expect(cleanRes.status).toBe(200);
    expect(cleanRes.body.message).toBe('Device Clean');
  });
});
