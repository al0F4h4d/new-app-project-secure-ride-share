import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database.config';
import { connectRedis, disconnectRedis } from '../../src/config/redis.config';
import { User } from '../../src/models/user.model';
import { DriverProfile } from '../../src/models/driverProfile.model';
import { Vehicle } from '../../src/models/vehicle.model';
import { CommissionPass } from '../../src/models/commissionPass.model';
import { DeviceBlacklist } from '../../src/models/deviceBlacklist.model';
import { NidBlacklist } from '../../src/models/nidBlacklist.model';
import { signAccessToken } from '../../src/common/utils/jwt.util';
import { hashPassword } from '../../src/common/utils/crypto.util';
import {
  UserRoles,
  LicenseCategories,
  VehicleClasses,
  CommissionPassTypes,
} from '../../src/common/constants/roles.constant';
import { processTaxTokenExpirations } from '../../src/jobs/taxTokenExpiryWorker';

describe('Driver Onboarding, KYC, Vehicle Fleet & Pro Pass Integration Tests (/api/v1/drivers)', () => {
  const driverPhone = '+8801811223344';
  const passengerPhone = '+8801711223344';
  const testPassword = 'SecurePassword123@#';

  let driverUserId: string;
  let driverProfileId: string;
  let driverToken: string;
  let passengerToken: string;
  let testVehicleId: string;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();

    // Clean up old test data
    await User.deleteMany({ phone_number: { $in: [driverPhone, passengerPhone] } });

    const hashedPassword = await hashPassword(testPassword);

    // 1. Create Driver User
    const driverUser = await User.create({
      phone_number: driverPhone,
      email: 'driver.kyc@example.com',
      password_hash: hashedPassword,
      role: UserRoles.DRIVER,
      full_name: 'Kamrul Hasan',
    });
    driverUserId = driverUser._id.toString();

    // 2. Create Linked DriverProfile
    const profile = await DriverProfile.create({
      user_id: driverUser._id,
      verification_status: 'pending',
      current_wallet_balance: mongoose.Types.Decimal128.fromString('0.00'),
      failed_verification_attempts: 0,
      commission_pass_active: false,
    });
    driverProfileId = profile._id.toString();

    // 3. Create Passenger User for RBAC tests
    const passengerUser = await User.create({
      phone_number: passengerPhone,
      email: 'passenger.rbac@example.com',
      password_hash: hashedPassword,
      role: UserRoles.PASSENGER,
      full_name: 'Regular Passenger',
    });

    driverToken = signAccessToken({
      userId: driverUserId,
      role: UserRoles.DRIVER,
    });

    passengerToken = signAccessToken({
      userId: passengerUser._id.toString(),
      role: UserRoles.PASSENGER,
    });
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: [driverUserId] } });
    await DriverProfile.deleteMany({ _id: driverProfileId });
    await Vehicle.deleteMany({ driver_id: driverProfileId });
    await CommissionPass.deleteMany({ driver_id: driverProfileId });
    await DeviceBlacklist.deleteMany({ imei_hash: 'hw_test_driver_imei' });
    await NidBlacklist.deleteMany({});

    await disconnectDatabase();
    await disconnectRedis();
  }, 30000);

  describe('RBAC & Role Gate', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .patch('/api/v1/drivers/status/online')
        .send({ is_online: true })
        .expect(401);

      expect(res.body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should reject passenger token on driver endpoints with 403 AUTH_FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .patch('/api/v1/drivers/status/online')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ is_online: true })
        .expect(403);

      expect(res.body.errorCode).toBe('AUTH_FORBIDDEN_ROLE');
    });
  });

  describe('4.1 Step 1: Submit Identity & License Documents (POST /drivers/kyc/step1-identity)', () => {
    it('should upload NID and License, trigger OCR parsing, and return step 1 completion', async () => {
      const fakeNidFront = Buffer.from('FAKE_SMART_NID_FRONT_IMAGE_5912345678');
      const fakeNidBack = Buffer.from('FAKE_SMART_NID_BACK_IMAGE');
      const fakeLicense = Buffer.from('FAKE_BRTA_LICENSE_IMAGE_DK0948201_MOTORCYCLE');

      const res = await request(app)
        .post('/api/v1/drivers/kyc/step1-identity')
        .set('Authorization', `Bearer ${driverToken}`)
        .field('nid_number', '5912345678')
        .field('license_number', 'DK0948201')
        .field('license_category', 'motorcycle')
        .field('license_expiry_date', '2029-05-10')
        .attach('nid_document_front', fakeNidFront, 'nid_front.jpg')
        .attach('nid_document_back', fakeNidBack, 'nid_back.jpg')
        .attach('license_document', fakeLicense, 'license.jpg')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.step1_completed).toBe(true);
      expect(res.body.data.next_step).toBe('step2-biometrics');
      expect(res.body.data.ocr_extracted).toBeDefined();

      // Verify MongoDB persistence
      const profile = await DriverProfile.findById(driverProfileId);
      expect(profile?.nid_number).toBe('5912345678');
      expect(profile?.license_number).toBe('DK0948201');
      expect(profile?.license_category).toBe(LicenseCategories.MOTORCYCLE);
      expect(profile?.nid_document_front_url).toContain('kyc/');
    });
  });

  describe('4.2 Step 2: Biometrics & Face Match (POST /drivers/kyc/step2-biometrics)', () => {
    it('should reject with 422 DRIVER_FACIAL_MISMATCH and initiate 1-hour lockout when face similarity < 90%', async () => {
      const imposterSelfie = Buffer.from('mismatch_imposter_face_photo');

      const res = await request(app)
        .post('/api/v1/drivers/kyc/step2-biometrics')
        .set('Authorization', `Bearer ${driverToken}`)
        .set('x-device-fingerprint', 'hw_test_driver_imei')
        .field('liveness_sdk_token', 'tok_live_091823abf')
        .attach('live_selfie', imposterSelfie, 'selfie_fail.jpg')
        .expect(422);

      expect(res.body.errorCode).toBe('DRIVER_FACIAL_MISMATCH');
      expect(res.body.message).toContain('does not match');

      const profile = await DriverProfile.findById(driverProfileId);
      expect(profile?.failed_verification_attempts).toBe(1);
      expect(profile?.lockout_until).not.toBeNull();
    });

    it('should reject with 423 DRIVER_LOCKOUT_ACTIVE when attempting verification while locked out', async () => {
      const selfie = Buffer.from('driver_live_selfie_portrait');

      const res = await request(app)
        .post('/api/v1/drivers/kyc/step2-biometrics')
        .set('Authorization', `Bearer ${driverToken}`)
        .field('liveness_sdk_token', 'tok_live_091823abf')
        .attach('live_selfie', selfie, 'selfie.jpg')
        .expect(423);

      expect(res.body.errorCode).toBe('DRIVER_LOCKOUT_ACTIVE');
    });

    it('should verify biometrics and queue profile for admin review when face similarity >= 90%', async () => {
      // Clear lockout for the next attempt
      await DriverProfile.findByIdAndUpdate(driverProfileId, { lockout_until: null });

      const validSelfie = Buffer.from('valid_driver_live_selfie_portrait');

      const res = await request(app)
        .post('/api/v1/drivers/kyc/step2-biometrics')
        .set('Authorization', `Bearer ${driverToken}`)
        .field('liveness_sdk_token', 'tok_live_091823abf')
        .attach('live_selfie', validSelfie, 'selfie_pass.jpg')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.verification_status).toBe('pending');
      expect(res.body.data.face_match_confidence).toBeGreaterThanOrEqual(90);

      const profile = await DriverProfile.findById(driverProfileId);
      expect(profile?.failed_verification_attempts).toBe(0);
      expect(profile?.live_selfie_url).toBeDefined();
      expect(profile?.facial_vector_hash).toBeDefined();
    });
  });

  describe('4.3 Register Fleet Vehicle (POST /drivers/vehicles)', () => {
    it('should reject vehicle registration if vehicle class mismatches license category', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Driver has motorcycle license, attempting to register a microbus
      const res = await request(app)
        .post('/api/v1/drivers/vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .field('brta_plate_number', 'Dhaka Metro-CHA 51-9988')
        .field('tax_token_number', 'TT-2026-112233')
        .field('tax_token_expiry', futureDate.toISOString().split('T')[0])
        .field('vehicle_class', 'microbus')
        .field('brand', 'Toyota')
        .field('model_name', 'HiAce')
        .field('color', 'White')
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_FAILED');
      expect(res.body.message).toContain('Motorcycle license holders can only register vehicles in the \'bike\' class');
    });

    it('should successfully register a compatible fleet vehicle with is_approved = false', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      const fakeFront = Buffer.from('FAKE_BIKE_FRONT');
      const fakeRear = Buffer.from('FAKE_BIKE_REAR');
      const fakeReg = Buffer.from('FAKE_REG_DOC');

      const res = await request(app)
        .post('/api/v1/drivers/vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .field('brta_plate_number', 'Dhaka Metro-HA 45-8912')
        .field('tax_token_number', 'TT-2026-904123')
        .field('tax_token_expiry', futureDate.toISOString().split('T')[0])
        .field('vehicle_class', VehicleClasses.BIKE)
        .field('brand', 'Yamaha')
        .field('model_name', 'FZS V3 ABS')
        .field('color', 'Matte Blue')
        .attach('front_photo', fakeFront, 'front.jpg')
        .attach('rear_photo', fakeRear, 'rear.jpg')
        .attach('registration_document', fakeReg, 'reg.pdf')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicle_id).toBeDefined();
      expect(res.body.data.brta_plate_number).toBe('Dhaka Metro-HA 45-8912');
      expect(res.body.data.is_approved).toBe(false);

      testVehicleId = res.body.data.vehicle_id;
    });
  });

  describe('4.4 Set Active Operational Vehicle (PATCH /drivers/vehicles/:id/activate)', () => {
    it('should reject activation if vehicle is not yet approved by admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/drivers/vehicles/${testVehicleId}/activate`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_FAILED');
      expect(res.body.message).toContain('Only approved vehicles can be activated');
    });

    it('should activate vehicle after admin regulatory approval', async () => {
      // Simulate Admin Approval
      await Vehicle.findByIdAndUpdate(testVehicleId, { is_approved: true });

      const res = await request(app)
        .patch(`/api/v1/drivers/vehicles/${testVehicleId}/activate`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.active_vehicle_id).toBe(testVehicleId);
      expect(res.body.data.brta_plate_number).toBe('Dhaka Metro-HA 45-8912');

      const profile = await DriverProfile.findById(driverProfileId);
      expect(profile?.active_vehicle_id?.toString()).toBe(testVehicleId);
    });
  });

  describe('4.5 Online/Offline Dispatch Gate (PATCH /drivers/status/online)', () => {
    it('should block online toggle if driver wallet debt exceeds -৳500.00 (-৳505.00)', async () => {
      // Set wallet debt to -505.00 BDT
      await DriverProfile.findByIdAndUpdate(driverProfileId, {
        current_wallet_balance: mongoose.Types.Decimal128.fromString('-505.00'),
      });

      const res = await request(app)
        .patch('/api/v1/drivers/status/online')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          is_online: true,
          current_coordinates: [90.4043, 23.7937],
        })
        .expect(403);

      expect(res.body.errorCode).toBe('DRIVER_WALLET_DEBT_LIMIT');
      expect(res.body.message).toContain('-৳500.00');
    });

    it('should allow online toggle when wallet balance is positive and active approved vehicle is present', async () => {
      // Reset wallet balance to positive 840.50 BDT
      await DriverProfile.findByIdAndUpdate(driverProfileId, {
        current_wallet_balance: mongoose.Types.Decimal128.fromString('840.50'),
      });

      const res = await request(app)
        .patch('/api/v1/drivers/status/online')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          is_online: true,
          current_coordinates: [90.4043, 23.7937],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.is_online).toBe(true);
      expect(res.body.data.active_vehicle).toBe('Dhaka Metro-HA 45-8912');
      expect(res.body.data.wallet_balance).toBe('840.50');
    });
  });

  describe('4.6 Pro-Captain Zero-Commission Pass (POST /drivers/commission-pass/purchase)', () => {
    it('should purchase a Pro-Captain Daily Pass (৳99 / 24h) and set commission_pass_active = true', async () => {
      const res = await request(app)
        .post('/api/v1/drivers/commission-pass/purchase')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          pass_type: CommissionPassTypes.DAILY,
          payment_method: 'bkash',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pass_type).toBe('daily');
      expect(res.body.data.price_bdt).toBe('99.00');

      const profile = await DriverProfile.findById(driverProfileId);
      expect(profile?.commission_pass_active).toBe(true);
      expect(profile?.commission_pass_type).toBe('daily');
      expect(profile?.commission_pass_expiry).toBeDefined();

      const pass = await CommissionPass.findById(res.body.data.pass_id);
      expect(pass).not.toBeNull();
      expect(pass?.driver_id.toString()).toBe(driverProfileId);
    });

    it('should purchase a Pro-Captain Weekly Pass (৳599 / 7 days) and extend validity', async () => {
      const res = await request(app)
        .post('/api/v1/drivers/commission-pass/purchase')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          pass_type: CommissionPassTypes.WEEKLY,
          payment_method: 'nagad',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pass_type).toBe('weekly');
      expect(res.body.data.price_bdt).toBe('599.00');

      const profile = await DriverProfile.findById(driverProfileId);
      expect(profile?.commission_pass_active).toBe(true);
      expect(profile?.commission_pass_type).toBe('weekly');
    });
  });

  describe('4.7 Tax Token Expiry Worker (taxTokenExpiryWorker.ts)', () => {
    it('should revoke approval for vehicles where tax token expires within 15 days', async () => {
      // Set test vehicle tax token expiry to 10 days from today (within the 15-day danger zone)
      const nearExpiry = new Date();
      nearExpiry.setDate(nearExpiry.getDate() + 10);

      await Vehicle.findByIdAndUpdate(testVehicleId, {
        tax_token_expiry: nearExpiry,
        is_approved: true,
      });

      // Execute worker sweep
      const revoked = await processTaxTokenExpirations(new Date());

      expect(revoked.some((v) => v.vehicleId === testVehicleId)).toBe(true);

      // Verify in DB that is_approved is now false
      const updatedVehicle = await Vehicle.findById(testVehicleId);
      expect(updatedVehicle?.is_approved).toBe(false);

      // Verify driver can no longer go online with this revoked vehicle
      const onlineRes = await request(app)
        .patch('/api/v1/drivers/status/online')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ is_online: true })
        .expect(400);

      expect(onlineRes.body.errorCode).toBe('DRIVER_NO_ACTIVE_VEHICLE');
    });
  });
});
