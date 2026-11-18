import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database.config';
import { connectRedis, disconnectRedis } from '../../src/config/redis.config';
import { User } from '../../src/models/user.model';
import { RefreshToken } from '../../src/models/refreshToken.model';
import { Trip } from '../../src/models/trip.model';
import { PassengerWalletTransaction } from '../../src/models/passengerWalletTransaction.model';
import { signAccessToken } from '../../src/common/utils/jwt.util';
import { hashPassword } from '../../src/common/utils/crypto.util';
import {
  UserRoles,
  DeletionStatuses,
  RideStatuses,
  VehicleClasses,
  PaymentMethods,
  PassengerWalletTransactionTypes,
} from '../../src/common/constants/roles.constant';
import { processAccountDeletions } from '../../src/jobs/accountDeletionWorker';

describe('Passenger Profile, Addresses & Account Deletion Integration Test Suite (/api/v1/passengers)', () => {
  const passengerPhone = '+8801722334455';
  const otherPassengerPhone = '+8801733445566';
  const driverPhone = '+8801822334455';
  const testPassword = 'TestPassword123@#';

  let passengerId: string;
  let passengerToken: string;
  let otherPassengerId: string;
  let driverToken: string;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();

    // Clean up test data
    await User.deleteMany({
      phone_number: { $in: [passengerPhone, otherPassengerPhone, driverPhone] },
    });

    const hashedPassword = await hashPassword(testPassword);

    // Create primary test passenger
    const passengerUser = await User.create({
      phone_number: passengerPhone,
      email: 'tanvir.test@example.com',
      password_hash: hashedPassword,
      role: UserRoles.PASSENGER,
      full_name: 'Tanvir Ahmed',
      passenger_wallet_balance: mongoose.Types.Decimal128.fromString('40.00'),
      rating_avg: 4.92,
      total_ratings_count: 28,
      language_preference: 'bn',
      emergency_contacts: [
        {
          name: 'Nusrat Jahan',
          phone_number: '+8801819876543',
          relationship: 'Spouse',
        },
      ],
      saved_addresses: [],
      deletion_status: DeletionStatuses.ACTIVE,
    });
    passengerId = passengerUser._id.toString();

    // Create a second passenger for collision testing
    const otherUser = await User.create({
      phone_number: otherPassengerPhone,
      email: 'existing.email@example.com',
      password_hash: hashedPassword,
      role: UserRoles.PASSENGER,
      full_name: 'Existing User',
      deletion_status: DeletionStatuses.ACTIVE,
    });
    otherPassengerId = otherUser._id.toString();

    // Create driver for RBAC testing
    const driverUser = await User.create({
      phone_number: driverPhone,
      email: 'driver.test@example.com',
      password_hash: hashedPassword,
      role: UserRoles.DRIVER,
      full_name: 'Driver Ahmed',
      deletion_status: DeletionStatuses.ACTIVE,
    });

    // Generate JWT access tokens
    passengerToken = signAccessToken({
      userId: passengerId,
      role: UserRoles.PASSENGER,
    });

    driverToken = signAccessToken({
      userId: driverUser._id.toString(),
      role: UserRoles.DRIVER,
    });
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({
      $or: [
        { _id: { $in: [passengerId, otherPassengerId] } },
        { phone_number: { $in: [passengerPhone, otherPassengerPhone, driverPhone] } },
      ],
    });
    await RefreshToken.deleteMany({ user_id: { $in: [passengerId, otherPassengerId] } });
    await Trip.deleteMany({ passenger_id: passengerId });
    await PassengerWalletTransaction.deleteMany({ user_id: passengerId });

    await disconnectDatabase();
    await disconnectRedis();
  }, 30000);

  describe('RBAC & Authentication Gates', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/passengers/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should reject non-passenger role (Driver) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/passengers/me')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(res.body.errorCode).toBe('AUTH_FORBIDDEN_ROLE');
    });
  });

  describe('3.1 Get Passenger Profile (GET /passengers/me)', () => {
    it('should return complete passenger profile with wallet balance and emergency contacts', async () => {
      const res = await request(app)
        .get('/api/v1/passengers/me')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        _id: passengerId,
        phone_number: passengerPhone,
        email: 'tanvir.test@example.com',
        full_name: 'Tanvir Ahmed',
        passenger_wallet_balance: '40.00',
        rating_avg: 4.92,
        total_ratings_count: 28,
        language_preference: 'bn',
        deletion_status: 'active',
      });
      expect(res.body.data.emergency_contacts).toHaveLength(1);
    });
  });

  describe('3.2 Update Passenger Profile (PATCH /passengers/me)', () => {
    it('should update display name and language preference', async () => {
      const res = await request(app)
        .patch('/api/v1/passengers/me')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          full_name: 'Tanvir Ahmed Chowdhury',
          language_preference: 'en',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Profile updated successfully.');
      expect(res.body.data.full_name).toBe('Tanvir Ahmed Chowdhury');
      expect(res.body.data.language_preference).toBe('en');

      // Verify persistence in MongoDB
      const updatedUser = await User.findById(passengerId);
      expect(updatedUser?.full_name).toBe('Tanvir Ahmed Chowdhury');
      expect(updatedUser?.language_preference).toBe('en');
    });

    it('should reject email update if email is already taken by another account', async () => {
      const res = await request(app)
        .patch('/api/v1/passengers/me')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          email: 'existing.email@example.com',
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(res.body.errorCode).toBe('VALIDATION_FAILED');
    });
  });

  describe('3.3 Emergency Contacts (PUT /passengers/emergency-contacts)', () => {
    it('should reject when 4 emergency contacts are submitted with 400 VALIDATION_FAILED', async () => {
      const res = await request(app)
        .put('/api/v1/passengers/emergency-contacts')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          emergency_contacts: [
            { name: 'Contact 1', phone_number: '+8801819876543', relationship: 'Spouse' },
            { name: 'Contact 2', phone_number: '+8801711223344', relationship: 'Brother' },
            { name: 'Contact 3', phone_number: '+8801911998877', relationship: 'Father' },
            { name: 'Contact 4', phone_number: '+8801511223344', relationship: 'Sister' },
          ],
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_FAILED');
      expect(res.body.errors[0]?.message).toMatch(/A maximum of 3 emergency contacts/);
    });

    it('should successfully update up to 3 emergency contacts', async () => {
      const res = await request(app)
        .put('/api/v1/passengers/emergency-contacts')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          emergency_contacts: [
            { name: 'Nusrat Jahan', phone_number: '+8801819876543', relationship: 'Spouse' },
            { name: 'Farhan Ahmed', phone_number: '+8801711223344', relationship: 'Brother' },
            { name: 'Kamal Hossain', phone_number: '+8801911998877', relationship: 'Father' },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('3/3 configured');
      expect(res.body.data.emergency_contacts).toHaveLength(3);

      const user = await User.findById(passengerId);
      expect(user?.emergency_contacts).toHaveLength(3);
    });
  });

  describe('3.4 Saved Addresses (POST, GET, DELETE /passengers/saved-addresses)', () => {
    it('should save a new Work address bookmark with 201 Created', async () => {
      const res = await request(app)
        .post('/api/v1/passengers/saved-addresses')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          label: 'Work',
          address_text: 'IDB Bhaban, Rokeya Sarani, Agargaon, Dhaka-1207',
          coordinates: [90.3789, 23.7776],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Address saved successfully.');
      expect(res.body.data.label).toBe('Work');
      expect(res.body.data.location.coordinates).toEqual([90.3789, 23.7776]);
    });

    it('should save a Home address bookmark', async () => {
      const res = await request(app)
        .post('/api/v1/passengers/saved-addresses')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          label: 'Home',
          address_text: 'House 42, Road 7, Dhanmondi, Dhaka',
          coordinates: [90.3742, 23.7461],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('Home');
    });

    it('should retrieve all saved addresses via GET /passengers/saved-addresses', async () => {
      const res = await request(app)
        .get('/api/v1/passengers/saved-addresses')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      const labels = res.body.data.map((a: { label: string }) => a.label);
      expect(labels).toContain('Work');
      expect(labels).toContain('Home');
    });

    it('should delete Work address by label via DELETE /passengers/saved-addresses/:label', async () => {
      const res = await request(app)
        .delete('/api/v1/passengers/saved-addresses/Work')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const getRes = await request(app)
        .get('/api/v1/passengers/saved-addresses')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(getRes.body.data).toHaveLength(1);
      expect(getRes.body.data[0].label).toBe('Home');
    });
  });

  describe('3.5 & 3.6 Account Deletion Lifecycle & Revocation', () => {
    it('should reject deletion request when incorrect password is provided', async () => {
      const res = await request(app)
        .post('/api/v1/passengers/account-deletion')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          confirmation_password: 'WrongPassword999!',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should initiate 30-day grace period account deletion with correct password', async () => {
      // Create a test refresh token for this passenger to verify token revocation
      await RefreshToken.create({
        user_id: new mongoose.Types.ObjectId(passengerId),
        token_hash: 'sample_token_hash_passenger',
        family_id: 'family_pass_123',
        is_revoked: false,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/v1/passengers/account-deletion')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          confirmation_password: testPassword,
          feedback_reason: 'Switching to metro rail',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deletion_status).toBe('pending_deletion');
      expect(res.body.data.deletion_requested_at).toBeDefined();
      expect(res.body.data.scheduled_deletion_at).toBeDefined();

      const scheduledDate = new Date(res.body.data.scheduled_deletion_at);
      const requestedDate = new Date(res.body.data.deletion_requested_at);
      const diffDays = Math.round((scheduledDate.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);

      // Verify refresh tokens are revoked
      const tokens = await RefreshToken.find({ user_id: passengerId });
      expect(tokens.every((t) => t.is_revoked)).toBe(true);
    });

    it('should allow user to cancel/revoke deletion before 30 days', async () => {
      const res = await request(app)
        .delete('/api/v1/passengers/account-deletion')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deletion_status).toBe('active');

      const user = await User.findById(passengerId);
      expect(user?.deletion_status).toBe('active');
      expect(user?.deletion_requested_at).toBeNull();
      expect(user?.scheduled_deletion_at).toBeNull();
    });
  });

  describe('BullMQ Worker: PII Scrubbing & Financial Audit Trail Retention', () => {
    it('should scrub PII after 30 days while retaining trips and financial records for statutory audit', async () => {
      // 1. Set user back to pending_deletion scheduled in the past (31 days ago)
      const pastRequested = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
      const pastScheduled = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      await User.findByIdAndUpdate(passengerId, {
        deletion_status: DeletionStatuses.PENDING_DELETION,
        deletion_requested_at: pastRequested,
        scheduled_deletion_at: pastScheduled,
        phone_number: passengerPhone,
        email: 'tanvir.purge@example.com',
        full_name: 'Tanvir Ahmed Chowdhury',
        profile_photo_url: 'https://cdn.secride.bd/photos/tanvir.webp',
        emergency_contacts: [
          { name: 'Nusrat Jahan', phone_number: '+8801819876543', relationship: 'Spouse' },
        ],
        saved_addresses: [
          {
            label: 'Home',
            address_text: 'Dhanmondi, Dhaka',
            location: { type: 'Point', coordinates: [90.3742, 23.7461] },
          },
        ],
      });

      // 2. Insert statutory financial and trip records for this passenger
      const testTrip = await Trip.create({
        trip_code: `TRX-${Date.now()}`,
        passenger_id: new mongoose.Types.ObjectId(passengerId),
        pickup_address: 'Banani 11, Dhaka',
        pickup_geo: { type: 'Point', coordinates: [90.4043, 23.7937] },
        dropoff_address: 'Gulshan 2 Circle, Dhaka',
        dropoff_geo: { type: 'Point', coordinates: [90.4174, 23.7925] },
        status: RideStatuses.COMPLETED,
        vehicle_class: VehicleClasses.BIKE,
        upfront_fare: mongoose.Types.Decimal128.fromString('150.00'),
        surge_multiplier: 1.0,
        payment_method: PaymentMethods.BKASH,
        pickup_otp_hash: 'valid_otp_hash',
      });

      const testWalletTx = await PassengerWalletTransaction.create({
        user_id: new mongoose.Types.ObjectId(passengerId),
        trip_id: testTrip._id,
        transaction_type: PassengerWalletTransactionTypes.CASH_CHANGE_CREDIT,
        amount: mongoose.Types.Decimal128.fromString('20.00'),
        balance_before: mongoose.Types.Decimal128.fromString('0.00'),
        balance_after: mongoose.Types.Decimal128.fromString('20.00'),
        description: 'Statutory audit trail change credit',
      });

      // 3. Execute Worker PII scrubbing sweep
      const scrubResults = await processAccountDeletions(new Date());

      expect(scrubResults.some((r) => r.userId === passengerId)).toBe(true);

      // 4. Verify PII scrubbing on User document
      const scrubbedUser = await User.findById(passengerId);
      expect(scrubbedUser?.deletion_status).toBe(DeletionStatuses.DELETED);
      expect(scrubbedUser?.full_name).toBeNull();
      expect(scrubbedUser?.email).toBeNull();
      expect(scrubbedUser?.phone_number).toBeNull();
      expect(scrubbedUser?.profile_photo_url).toBeNull();
      expect(scrubbedUser?.emergency_contacts).toEqual([]);
      expect(scrubbedUser?.saved_addresses).toEqual([]);

      // 5. Verify statutory audit records are strictly preserved intact
      const preservedTrip = await Trip.findById(testTrip._id);
      expect(preservedTrip).not.toBeNull();
      expect(preservedTrip?.passenger_id.toString()).toBe(passengerId);
      expect(preservedTrip?.upfront_fare.toString()).toBe('150.00');

      const preservedWalletTx = await PassengerWalletTransaction.findById(testWalletTx._id);
      expect(preservedWalletTx).not.toBeNull();
      expect(preservedWalletTx?.user_id.toString()).toBe(passengerId);
      expect(preservedWalletTx?.amount.toString()).toBe('20.00');

      // 6. Verify deleted user cannot log in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone_number: passengerPhone,
          password: testPassword,
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(loginRes.body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });
});
