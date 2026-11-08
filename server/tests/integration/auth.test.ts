import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database.config';
import { connectRedis, disconnectRedis, redisClient, isRedisConnected } from '../../src/config/redis.config';
import { User } from '../../src/models/user.model';
import { DriverProfile } from '../../src/models/driverProfile.model';
import { RefreshToken } from '../../src/models/refreshToken.model';
import { NidBlacklist } from '../../src/models/nidBlacklist.model';
import { DeviceBlacklist } from '../../src/models/deviceBlacklist.model';
import { BanTypes } from '../../src/common/constants/roles.constant';
import { hashDeterministic } from '../../src/common/utils/crypto.util';

describe('Dual-Tier Authentication & RBAC Integration Test Suite (/api/v1/auth)', () => {
  const passengerPhone = '+8801700112233';
  const driverPhone = '+8801800112233';
  const blacklistedPhone = '+8801900112233';
  const rateLimitedPhone = '+8801699998888';
  const blacklistedNid = '9876543210';
  const testPassword = 'Password123@#';

  const clearRedisKeys = async (phone: string) => {
    if (isRedisConnected()) {
      await redisClient.del(`rl:otp:${phone}`);
      await redisClient.del(`otp:${phone}`);
      await redisClient.del(`otp_attempts:${phone}`);
      await redisClient.del(`lockout:otp:${phone}`);
    }
  };

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();

    // Clean up any residual test records
    await User.deleteMany({ phone_number: { $in: [passengerPhone, driverPhone, blacklistedPhone] } });
    await NidBlacklist.deleteMany({ nid_hash: { $in: [blacklistedNid, hashDeterministic(blacklistedNid)] } });
    await DeviceBlacklist.deleteMany({ imei_hash: 'imei_test_banned_hardware' });

    await clearRedisKeys(passengerPhone);
    await clearRedisKeys(driverPhone);
    await clearRedisKeys(blacklistedPhone);
    await clearRedisKeys(rateLimitedPhone);
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({ phone_number: { $in: [passengerPhone, driverPhone, blacklistedPhone] } });
    await DriverProfile.deleteMany({});
    await RefreshToken.deleteMany({});
    await NidBlacklist.deleteMany({ nid_hash: { $in: [blacklistedNid, hashDeterministic(blacklistedNid)] } });
    await DeviceBlacklist.deleteMany({ imei_hash: 'imei_test_banned_hardware' });

    await clearRedisKeys(passengerPhone);
    await clearRedisKeys(driverPhone);
    await clearRedisKeys(blacklistedPhone);
    await clearRedisKeys(rateLimitedPhone);

    await disconnectDatabase();
    await disconnectRedis();
  }, 30000);

  describe('1. POST /api/v1/auth/send-otp', () => {
    it('should reject invalid mobile number format with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone_number: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject OTP request if NID is blacklisted with 403 AUTH_NID_BLACKLISTED', async () => {
      await NidBlacklist.create({
        nid_hash: blacklistedNid,
        ban_reason: 'Legal enforcement blacklist',
      });

      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          phone_number: blacklistedPhone,
          nid_number: blacklistedNid,
        });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('AUTH_NID_BLACKLISTED');
    });

    it('should dispatch OTP and return 200 with expiry metadata', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone_number: passengerPhone });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone_number).toBe(passengerPhone);
      expect(res.body.data.expires_in_seconds).toBe(120);
      expect(res.body.data.resend_available_in_seconds).toBe(60);
    });

    it('should enforce rate limit: 4th OTP request within 10 minutes returns 429 AUTH_OTP_RATE_LIMIT', async () => {
      const rateLimitedPhone = '+8801699998888';

      // 1st request
      const r1 = await request(app).post('/api/v1/auth/send-otp').send({ phone_number: rateLimitedPhone });
      expect(r1.status).toBe(200);

      // 2nd request
      const r2 = await request(app).post('/api/v1/auth/send-otp').send({ phone_number: rateLimitedPhone });
      expect(r2.status).toBe(200);

      // 3rd request
      const r3 = await request(app).post('/api/v1/auth/send-otp').send({ phone_number: rateLimitedPhone });
      expect(r3.status).toBe(200);

      // 4th request must be rate limited
      const r4 = await request(app).post('/api/v1/auth/send-otp').send({ phone_number: rateLimitedPhone });
      expect(r4.status).toBe(429);
      expect(r4.body.errorCode).toBe('AUTH_OTP_RATE_LIMIT');
    });
  });

  describe('2. POST /api/v1/auth/verify-otp', () => {
    it('should reject incorrect OTP with 400 AUTH_INVALID_OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone_number: passengerPhone,
          otp: '000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AUTH_INVALID_OTP');
    });

    it('should verify correct OTP for new user and issue registration_ticket (10m TTL)', async () => {
      // Retrieve the OTP from Redis
      let otp = '123456';
      if (isRedisConnected()) {
        const stored = await redisClient.get(`otp:${passengerPhone}`);
        if (stored) otp = stored;
      }

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone_number: passengerPhone,
          otp,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.is_new_user).toBe(true);
      expect(res.body.data.registration_ticket).toBeDefined();
      expect(res.body.data.ticket_expires_in).toBe(600);
    });
  });

  describe('3. POST /api/v1/auth/register', () => {
    let registrationTicket: string;

    beforeAll(async () => {
      // Clear rate limit then send and verify OTP to obtain fresh registration ticket
      await clearRedisKeys(passengerPhone);
      await request(app).post('/api/v1/auth/send-otp').send({ phone_number: passengerPhone });
      let otp = '123456';
      if (isRedisConnected()) {
        const stored = await redisClient.get(`otp:${passengerPhone}`);
        if (stored) otp = stored;
      }
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone_number: passengerPhone, otp });

      registrationTicket = verifyRes.body.data.registration_ticket;
    }, 30000);

    it('should reject registration with weak password (missing symbols/numbers)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          registration_ticket: registrationTicket,
          password: 'weakpassword',
          full_name: 'Test Passenger',
          role: 'passenger',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should register new passenger, hash with Argon2id, return valid JWT and set refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          registration_ticket: registrationTicket,
          password: testPassword,
          full_name: 'Tanvir Ahmed',
          email: 'tanvir.ahmed@example.com',
          role: 'passenger',
          language_preference: 'bn',
          emergency_contacts: [
            {
              name: 'Nusrat Jahan',
              phone_number: '+8801819876543',
              relationship: 'Spouse',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.user.role).toBe('passenger');
      expect(res.body.data.user.passenger_wallet_balance).toBe('0.00');

      // Check HttpOnly refresh token cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const hasRefreshCookie = cookies.some((c: string) => c.includes('__Secure-SR-RefreshToken'));
      expect(hasRefreshCookie).toBe(true);

      // Verify Argon2id hash in DB
      const userInDb = await User.findOne({ phone_number: passengerPhone });
      expect(userInDb).toBeDefined();
      expect(userInDb?.password_hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should atomically register a driver and create linked DriverProfile in pending state', async () => {
      // Driver onboarding flow
      await clearRedisKeys(driverPhone);
      await request(app).post('/api/v1/auth/send-otp').send({ phone_number: driverPhone });
      let otp = '123456';
      if (isRedisConnected()) {
        const stored = await redisClient.get(`otp:${driverPhone}`);
        if (stored) otp = stored;
      }
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone_number: driverPhone, otp });

      const driverTicket = verifyRes.body.data.registration_ticket;

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          registration_ticket: driverTicket,
          password: testPassword,
          full_name: 'Rafiqul Islam',
          role: 'driver',
          bkash_payout_number: '+8801811223344',
          nagad_payout_number: '+8801911223344',
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.data.user.role).toBe('driver');

      // Check linked driver profile
      const driverUser = await User.findOne({ phone_number: driverPhone });
      const driverProfile = await DriverProfile.findOne({ user_id: driverUser?._id });
      expect(driverProfile).toBeDefined();
      expect(driverProfile?.verification_status).toBe('pending');
      expect(driverProfile?.offline_collusion_strikes).toBe(0);
    });
  });

  describe('4. POST /api/v1/auth/login', () => {
    it('should reject login with wrong password (401 AUTH_INVALID_CREDENTIALS)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone_number: passengerPhone,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should reject login if device hardware is banned (403 AUTH_DEVICE_BANNED)', async () => {
      await DeviceBlacklist.create({
        imei_hash: 'imei_test_banned_hardware',
        android_id: 'android_test_banned_hardware',
        nid_hash: 'nid_hash_sample',
        license_hash: 'license_hash_sample',
        facial_vector_hash: 'face_hash_sample',
        integrity_verdict: 'MEETS_DEVICE_INTEGRITY',
        ban_type: BanTypes.OFFLINE_COLLUSION,
        ban_reason: 'Hardware banned due to 3-strike violations',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone_number: passengerPhone,
          password: testPassword,
          device_fingerprint: {
            imei_hash: 'imei_test_banned_hardware',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('AUTH_DEVICE_BANNED');
    });

    it('should successfully log in returning user and issue new token pair', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone_number: passengerPhone,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.user.phone_number).toBe(passengerPhone);
      expect(res.body.data.expires_in).toBe(900);
    });
  });

  describe('5. POST /api/v1/auth/refresh-token & Theft Revocation', () => {
    let initialRefreshTokenCookie: string;
    let initialRefreshTokenValue: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone_number: passengerPhone,
          password: testPassword,
        });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      initialRefreshTokenCookie = cookies.find((c: string) => c.includes('__Secure-SR-RefreshToken')) || '';
      initialRefreshTokenValue = initialRefreshTokenCookie.split(';')[0].replace('__Secure-SR-RefreshToken=', '');
    }, 30000);

    it('should rotate refresh token and issue a new access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`__Secure-SR-RefreshToken=${initialRefreshTokenValue}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.expires_in).toBe(900);

      // Verify a new cookie was set
      const newCookies = res.headers['set-cookie'] as unknown as string[];
      expect(newCookies).toBeDefined();
      const newCookie = newCookies.find((c: string) => c.includes('__Secure-SR-RefreshToken')) || '';
      const newRefreshTokenValue = newCookie.split(';')[0].replace('__Secure-SR-RefreshToken=', '');
      expect(newRefreshTokenValue).not.toBe(initialRefreshTokenValue);
    });

    it('should detect token reuse (theft) when presenting old refresh token and revoke entire token family', async () => {
      // Attempt to reuse initialRefreshTokenValue (which was invalidated during rotation above)
      const attackRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`__Secure-SR-RefreshToken=${initialRefreshTokenValue}`]);

      expect(attackRes.status).toBe(401);
      expect(attackRes.body.errorCode).toBe('AUTH_TOKEN_REVOKED');
      expect(attackRes.body.message).toContain('Security breach detected');

      // Verify that all tokens in that family are now revoked
      const tokensInDb = await RefreshToken.find({ is_revoked: false });
      const unrevokedCountForUser = tokensInDb.filter(
        (t) => t.user_id.toString() === (attackRes.body.meta?.userId || '')
      );
      expect(unrevokedCountForUser.length).toBe(0);
    });
  });

  describe('6. POST /api/v1/auth/logout', () => {
    it('should successfully log out and invalidate refresh cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone_number: passengerPhone,
          password: testPassword,
        });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const cookieHeader = cookies.find((c: string) => c.includes('__Secure-SR-RefreshToken')) || '';
      const accessToken = loginRes.body.data.access_token;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [cookieHeader]);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Cleared cookie
      const logoutCookies = logoutRes.headers['set-cookie'] as unknown as string[];
      expect(logoutCookies.some((c: string) => c.includes('__Secure-SR-RefreshToken=;'))).toBe(true);
    });
  });
});
