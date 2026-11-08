import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { DriverProfile } from '../../src/models/driverProfile.model';
import {
  DriverVerificationStatuses,
  LicenseCategories,
} from '../../src/common/constants/roles.constant';

describe('DriverProfile Model Schema & Validation Unit Test', () => {
  const futureExpiry = new Date();
  futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);

  const pastExpiry = new Date();
  pastExpiry.setFullYear(pastExpiry.getFullYear() - 1);

  it('should validate a valid driver profile document without errors', () => {
    const validDriverData = {
      user_id: new mongoose.Types.ObjectId(),
      nid_number: '1234567890',
      nid_document_front_url: 'https://r2.secureride.com/nid_front.jpg',
      nid_document_back_url: 'https://r2.secureride.com/nid_back.jpg',
      license_number: 'DK-123456789',
      license_category: LicenseCategories.MOTORCYCLE,
      license_expiry_date: futureExpiry,
      license_document_url: 'https://r2.secureride.com/license.jpg',
      live_selfie_url: 'https://r2.secureride.com/selfie.jpg',
      facial_vector_hash: 'a'.repeat(64),
      verification_status: DriverVerificationStatuses.PENDING,
      bkash_payout_number: '+8801712345678',
      nagad_payout_number: '+8801812345678',
      current_wallet_balance: mongoose.Types.Decimal128.fromString('150.00'),
    };

    const driver = new DriverProfile(validDriverData);
    const error = driver.validateSync();

    expect(error).toBeUndefined();
    expect(driver.verification_status).toBe(DriverVerificationStatuses.PENDING);
    expect(driver.is_permanently_banned).toBe(false);
    expect(driver.offline_collusion_strikes).toBe(0);
  });

  it('should reject invalid NID format (not 10 or 17 digits)', () => {
    const driverWithInvalidNid = new DriverProfile({
      user_id: new mongoose.Types.ObjectId(),
      nid_number: '12345', // 5 digits - invalid
      nid_document_front_url: 'url',
      nid_document_back_url: 'url',
      license_number: 'DK-123',
      license_category: LicenseCategories.MOTORCYCLE,
      license_expiry_date: futureExpiry,
      license_document_url: 'url',
      live_selfie_url: 'url',
      facial_vector_hash: 'a'.repeat(64),
      bkash_payout_number: '+8801712345678',
      nagad_payout_number: '+8801812345678',
    });

    const error = driverWithInvalidNid.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['nid_number']).toBeDefined();
    expect(error?.errors['nid_number'].message).toContain('Smart NID must be 10 or 17 digits');
  });

  it('should reject expired driving license date', () => {
    const driverWithExpiredLicense = new DriverProfile({
      user_id: new mongoose.Types.ObjectId(),
      nid_number: '1234567890',
      nid_document_front_url: 'url',
      nid_document_back_url: 'url',
      license_number: 'DK-123',
      license_category: LicenseCategories.LIGHT_VEHICLE,
      license_expiry_date: pastExpiry, // Expired
      license_document_url: 'url',
      live_selfie_url: 'url',
      facial_vector_hash: 'a'.repeat(64),
      bkash_payout_number: '+8801712345678',
      nagad_payout_number: '+8801812345678',
    });

    const error = driverWithExpiredLicense.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['license_expiry_date']).toBeDefined();
    expect(error?.errors['license_expiry_date'].message).toContain('must be in the future');
  });

  it('should reject wallet debt exceeding -500.00 BDT', () => {
    const driverWithExcessiveDebt = new DriverProfile({
      user_id: new mongoose.Types.ObjectId(),
      nid_number: '1234567890',
      nid_document_front_url: 'url',
      nid_document_back_url: 'url',
      license_number: 'DK-123',
      license_category: LicenseCategories.MOTORCYCLE,
      license_expiry_date: futureExpiry,
      license_document_url: 'url',
      live_selfie_url: 'url',
      facial_vector_hash: 'a'.repeat(64),
      bkash_payout_number: '+8801712345678',
      nagad_payout_number: '+8801812345678',
      current_wallet_balance: mongoose.Types.Decimal128.fromString('-550.00'), // Debt exceeds -500
    });

    const error = driverWithExcessiveDebt.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['current_wallet_balance']).toBeDefined();
    expect(error?.errors['current_wallet_balance'].message).toContain(
      'Driver wallet debt cannot exceed -500.00 BDT'
    );
  });
});

