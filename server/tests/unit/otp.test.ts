import { describe, it, expect } from '@jest/globals';
import {
  generateSecureOTP,
  normalizePhoneNumber,
  storeOTP,
  verifyOTP,
  checkOtpRateLimit,
  storeRegistrationTicket,
  consumeRegistrationTicket,
} from '../../src/common/utils/otp.util';
import { BadRequestError } from '../../src/common/errors/appError';
import { ErrorCodes } from '../../src/common/constants/errorCodes.constant';

describe('OTP & Rate Limiting Utilities Unit Test', () => {

  it('should normalize Bangladeshi phone numbers into E.164 (+880...) format', () => {
    expect(normalizePhoneNumber('01712345678')).toBe('+8801712345678');
    expect(normalizePhoneNumber('+8801712345678')).toBe('+8801712345678');
    expect(normalizePhoneNumber('8801712345678')).toBe('+8801712345678');
  });

  it('should generate 6-digit numeric OTP', () => {
    const otp = generateSecureOTP();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should store and successfully verify valid OTP', async () => {
    const phone = '+8801300000001';
    const otp = generateSecureOTP();

    await storeOTP(phone, otp, 60);
    const isValid = await verifyOTP(phone, otp);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect OTP and decrement attempt counter', async () => {
    const phone = '+8801300000002';
    const otp = '123456';
    await storeOTP(phone, otp, 60);

    await expect(verifyOTP(phone, '999999')).rejects.toThrow(BadRequestError);
  });

  it('should lock out phone after 5 consecutive failed attempts', async () => {
    const phone = '+8801300000003';
    const otp = '654321';
    await storeOTP(phone, otp, 60);

    for (let i = 0; i < 4; i++) {
      try {
        await verifyOTP(phone, '000000');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestError);
      }
    }

    // 5th attempt locks out
    await expect(verifyOTP(phone, '000000')).rejects.toMatchObject({
      errorCode: ErrorCodes.AUTH_OTP_RATE_LIMIT,
      statusCode: 429,
    });
  });

  it('should enforce rate limit of maximum 3 OTP requests per 10 minutes', async () => {
    const phone = '+8801300000004';

    // 1st, 2nd, 3rd requests succeed
    await expect(checkOtpRateLimit(phone)).resolves.not.toThrow();
    await expect(checkOtpRateLimit(phone)).resolves.not.toThrow();
    await expect(checkOtpRateLimit(phone)).resolves.not.toThrow();

    // 4th request must throw 429 AUTH_OTP_RATE_LIMIT
    await expect(checkOtpRateLimit(phone)).rejects.toMatchObject({
      errorCode: ErrorCodes.AUTH_OTP_RATE_LIMIT,
      statusCode: 429,
    });
  });

  it('should generate, store, and single-use consume a registration ticket', async () => {
    const phone = '+8801300000005';
    const ticket = await storeRegistrationTicket(phone);

    expect(ticket.startsWith('reg_ticket_')).toBe(true);

    // First consumption succeeds
    const ticketData = await consumeRegistrationTicket(ticket);
    expect(ticketData).toBeDefined();
    expect(ticketData?.phone_number).toBe(phone);

    // Second consumption fails (single-use)
    const secondTry = await consumeRegistrationTicket(ticket);
    expect(secondTry).toBeNull();
  });
});
