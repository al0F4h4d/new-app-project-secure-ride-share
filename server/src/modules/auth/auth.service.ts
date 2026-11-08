import mongoose from 'mongoose';
import {
  SendOtpDto,
  SendOtpResponseData,
  VerifyOtpDto,
  VerifyOtpResponseData,
  RegisterUserDto,
  RegisterResponseData,
  LoginDto,
  LoginResponseData,
  RefreshTokenResponseData,
  UserSummaryData,
} from './auth.types';
import { authRepository } from './auth.repository';
import {
  normalizePhoneNumber,
  checkOtpRateLimit,
  generateSecureOTP,
  storeOTP,
  verifyOTP,
  storeRegistrationTicket,
  consumeRegistrationTicket,
} from '../../common/utils/otp.util';
import { dispatchSms, buildOtpMessage } from '../../common/utils/sms.util';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  generateFamilyId,
  getRefreshTokenExpiryDate,
} from '../../common/utils/jwt.util';
import { hashPassword, verifyPassword } from '../../common/utils/crypto.util';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../common/errors/appError';
import { ErrorCodes } from '../../common/constants/errorCodes.constant';
import { DriverVerificationStatuses } from '../../common/constants/roles.constant';
import { IDeviceFingerprint } from '../../models/refreshToken.model';
import { logger } from '../../config/logger.config';
import { IUser } from '../../models/user.model';

export class AuthService {
  /**
   * Request Registration / Login SMS OTP
   */
  async sendOtp(dto: SendOtpDto): Promise<SendOtpResponseData> {
    const normalizedPhone = normalizePhoneNumber(dto.phone_number);

    // 1. Check NID Blacklist if NID provided
    if (dto.nid_number) {
      const isBlacklisted = await authRepository.isNidBlacklisted(dto.nid_number);
      if (isBlacklisted) {
        throw new ForbiddenError(
          ErrorCodes.AUTH_NID_BLACKLISTED,
          'This NID is legally blacklisted from SecureRide platform.',
          'এই জাতীয় পরিচয়পত্রটি প্ল্যাটফর্মে নিষিদ্ধ।'
        );
      }
    }

    // 2. Rate limit: Max 3 requests / 10 minutes (stored in Redis)
    await checkOtpRateLimit(normalizedPhone);

    // 3. Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOTP();

    // 4. Store in Redis with 120s TTL
    await storeOTP(normalizedPhone, otp, 120);

    // 5. Dispatch via SMS aggregator interface
    const smsMessage = buildOtpMessage(otp, dto.app_signature_hash || undefined);
    await dispatchSms(normalizedPhone, smsMessage);

    return {
      phone_number: normalizedPhone,
      expires_in_seconds: 120,
      resend_available_in_seconds: 60,
    };
  }

  /**
   * Verify SMS OTP
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    deviceFingerprint?: IDeviceFingerprint
  ): Promise<{ data: VerifyOtpResponseData; refreshToken?: string }> {
    const normalizedPhone = normalizePhoneNumber(dto.phone_number);

    // 1. Verify OTP with 5 failed attempts limit -> 15 min lockout
    await verifyOTP(normalizedPhone, dto.otp);

    // 2. Check if user already exists
    const existingUser = await authRepository.findUserByPhone(normalizedPhone);

    if (existingUser) {
      // Existing user -> Issue Access Token + Refresh Token
      const tokens = await this.issueTokenPair(existingUser, deviceFingerprint);

      let driverProfileId: string | undefined;
      let driverVerificationStatus: string | undefined;

      if (existingUser.role === 'driver') {
        const profile = await authRepository.findDriverProfileByUserId(existingUser._id);
        driverProfileId = profile?._id.toString();
        driverVerificationStatus = profile?.verification_status;
      }

      const userSummary: UserSummaryData = {
        _id: existingUser._id.toString(),
        phone_number: existingUser.phone_number,
        role: existingUser.role,
        full_name: existingUser.full_name,
        language_preference: existingUser.language_preference,
        email: existingUser.email,
        admin_sub_role: existingUser.admin_sub_role,
        passenger_wallet_balance: existingUser.passenger_wallet_balance?.toString(),
        rating_avg: existingUser.rating_avg,
        driver_profile_id: driverProfileId,
        verification_status: driverVerificationStatus,
      };

      return {
        data: {
          is_new_user: false,
          access_token: tokens.accessToken,
          token_type: 'Bearer',
          expires_in: 900,
          user: userSummary,
        },
        refreshToken: tokens.refreshToken,
      };
    }

    // New user -> Store registration ticket in Redis (10m TTL)
    const ticket = await storeRegistrationTicket(normalizedPhone);

    return {
      data: {
        is_new_user: true,
        registration_ticket: ticket,
        ticket_expires_in: 600,
      },
    };
  }

  /**
   * Complete User Registration
   */
  async register(
    dto: RegisterUserDto,
    deviceFingerprint?: IDeviceFingerprint
  ): Promise<{ data: RegisterResponseData; refreshToken: string }> {
    // 1. Validate & consume registration ticket from Redis
    const ticketData = await consumeRegistrationTicket(dto.registration_ticket);
    if (!ticketData) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid or expired registration ticket. Please request and verify OTP again.',
        'রেজিস্ট্রেশন টিকিটটির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে পুনরায় ওটিপি ভেরিফাই করুন।'
      );
    }

    const phone = ticketData.phone_number;

    // 2. Ensure phone is not already registered
    const existingUser = await authRepository.findUserByPhone(phone);
    if (existingUser) {
      throw new ConflictError(
        ErrorCodes.DISPATCH_CONCURRENT_RIDE,
        'An account with this phone number already exists.',
        'এই ফোন নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।'
      );
    }

    // 3. Hash password using Argon2id (m=65536, t=3, p=4)
    const passwordHash = await hashPassword(dto.password);

    // 4. Create User & linked DriverProfile atomically using transaction if possible
    let createdUser: IUser;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const userDoc = new (mongoose.model('User'))({
        phone_number: phone,
        password_hash: passwordHash,
        role: dto.role,
        full_name: dto.full_name,
        email: dto.email || null,
        language_preference: dto.language_preference || 'bn',
        emergency_contacts: dto.emergency_contacts || [],
        passenger_wallet_balance: mongoose.Types.Decimal128.fromString('0.00'),
        rating_avg: 5.0,
      });

      createdUser = await userDoc.save({ session });

      if (dto.role === 'driver') {
        const driverProfileDoc = new (mongoose.model('DriverProfile'))({
          user_id: createdUser._id,
          verification_status: DriverVerificationStatuses.PENDING,
          bkash_payout_number: dto.bkash_payout_number || null,
          nagad_payout_number: dto.nagad_payout_number || null,
          current_wallet_balance: mongoose.Types.Decimal128.fromString('0.00'),
          commission_pass_active: false,
          offline_collusion_strikes: 0,
          vehicle_mismatch_count: 0,
          is_permanently_banned: false,
        });

        await driverProfileDoc.save({ session });
      }

      await session.commitTransaction();
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

    // 5. Issue Token Pair
    const tokens = await this.issueTokenPair(createdUser, deviceFingerprint);

    const userSummary: UserSummaryData = {
      _id: createdUser._id.toString(),
      phone_number: createdUser.phone_number,
      role: createdUser.role,
      full_name: createdUser.full_name,
      language_preference: createdUser.language_preference,
      email: createdUser.email,
      passenger_wallet_balance: '0.00',
      rating_avg: createdUser.rating_avg,
    };

    return {
      data: {
        access_token: tokens.accessToken,
        user: userSummary,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * User Login (Phone + Password) with Device Blacklist Gate
   */
  async login(
    dto: LoginDto
  ): Promise<{ data: LoginResponseData; refreshToken: string }> {
    const normalizedPhone = normalizePhoneNumber(dto.phone_number);

    // 1. Device Blacklist Check
    if (dto.device_fingerprint) {
      const isBanned = await authRepository.isDeviceBlacklisted(
        dto.device_fingerprint.imei_hash,
        dto.device_fingerprint.android_id
      );

      if (isBanned) {
        throw new ForbiddenError(
          ErrorCodes.AUTH_DEVICE_BANNED,
          'Platform 3-strike multi-factor hardware ban.',
          'প্ল্যাটফর্মের নিয়ম ভঙ্গের কারণে ডিভাইসটি নিষিদ্ধ।'
        );
      }
    }

    // 2. Find user
    const user = await authRepository.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Incorrect mobile number or password.',
        'মোবাইল নম্বর অথবা পাসওয়ার্ড ভুল।'
      );
    }

    // 3. Verify Argon2id Password
    const isPasswordValid = await verifyPassword(user.password_hash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Incorrect mobile number or password.',
        'মোবাইল নম্বর অথবা পাসওয়ার্ড ভুল।'
      );
    }

    // 4. Issue Token Pair
    const tokens = await this.issueTokenPair(user, dto.device_fingerprint);

    let driverProfileId: string | undefined;
    let driverVerificationStatus: string | undefined;

    if (user.role === 'driver') {
      const profile = await authRepository.findDriverProfileByUserId(user._id);
      driverProfileId = profile?._id.toString();
      driverVerificationStatus = profile?.verification_status;
    }

    const userSummary: UserSummaryData = {
      _id: user._id.toString(),
      phone_number: user.phone_number,
      role: user.role,
      full_name: user.full_name,
      language_preference: user.language_preference,
      email: user.email,
      admin_sub_role: user.admin_sub_role,
      passenger_wallet_balance: user.passenger_wallet_balance?.toString(),
      rating_avg: user.rating_avg,
      driver_profile_id: driverProfileId,
      verification_status: driverVerificationStatus,
    };

    return {
      data: {
        access_token: tokens.accessToken,
        expires_in: 900,
        user: userSummary,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Single-Use Refresh Token Rotation with Theft Revocation
   */
  async refreshToken(
    rawRefreshToken: string,
    deviceFingerprint?: IDeviceFingerprint
  ): Promise<{ data: RefreshTokenResponseData; newRefreshToken: string }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Refresh token is required.',
        'রিফ্রেশ টোকেন প্রয়োজন।'
      );
    }

    const tokenHash = hashToken(rawRefreshToken);
    const tokenDoc = await authRepository.findRefreshTokenByHash(tokenHash);

    // 1. If token not found in DB
    if (!tokenDoc) {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_TOKEN_REVOKED,
        'Invalid or unrecognized refresh token.',
        'প্রদত্ত রিফ্রেশ টোকেনটি সঠিক নয়।'
      );
    }

    // 2. Token Reuse / Theft Detection: If already revoked, revoke the ENTIRE token family!
    if (tokenDoc.is_revoked) {
      logger.warn(
        `🚨 REFRESH TOKEN THEFT DETECTED: Attempted reuse of revoked token hash ${tokenHash.slice(0, 10)}... Revoking entire family ${tokenDoc.family_id}!`
      );
      await authRepository.revokeTokenFamily(tokenDoc.family_id);

      throw new UnauthorizedError(
        ErrorCodes.AUTH_TOKEN_REVOKED,
        'Security breach detected: Refresh token was already used. All active sessions have been revoked.',
        'নিরাপত্তা সতর্কবার্তা: পূর্বে ব্যবহৃত টোকেন পুনরায় ব্যবহারের চেষ্টার কারণে সেশন বাতিল করা হয়েছে।'
      );
    }

    // 3. Expiration Check
    if (tokenDoc.expires_at < new Date()) {
      await authRepository.revokeRefreshTokenById(tokenDoc._id);
      throw new UnauthorizedError(
        ErrorCodes.AUTH_TOKEN_EXPIRED,
        'Refresh token has expired. Please log in again.',
        'রিফ্রেশ টোকেনের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে পুনরায় লগইন করুন।'
      );
    }

    // 4. Invalidate current token (single-use rotation)
    await authRepository.revokeRefreshTokenById(tokenDoc._id);

    // 5. Fetch user to verify active standing
    const user = await authRepository.findUserById(tokenDoc.user_id.toString());
    if (!user || user.deletion_status === 'deleted') {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'User account is no longer active.',
        'ব্যবহারকারীর অ্যাকাউন্টটি সক্রিয় নয়।'
      );
    }

    // 6. Issue new token pair retaining the SAME family_id
    const newAccessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      admin_sub_role: user.admin_sub_role,
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    await authRepository.saveRefreshToken({
      userId: user._id,
      tokenHash: newRefreshTokenHash,
      familyId: tokenDoc.family_id,
      expiresAt: getRefreshTokenExpiryDate(),
      deviceFingerprint: deviceFingerprint || tokenDoc.device_fingerprint,
    });

    return {
      data: {
        access_token: newAccessToken,
        expires_in: 900,
      },
      newRefreshToken,
    };
  }

  /**
   * User Logout: Revokes active session and token family
   */
  async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const tokenDoc = await authRepository.findRefreshTokenByHash(tokenHash);
      if (tokenDoc) {
        await authRepository.revokeTokenFamily(tokenDoc.family_id);
      }
    }

    if (userId) {
      await authRepository.revokeAllUserTokens(userId);
    }
  }

  /**
   * Internal helper: Issues access token and persists a new refresh token family
   */
  private async issueTokenPair(
    user: IUser,
    deviceFingerprint?: IDeviceFingerprint
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      admin_sub_role: user.admin_sub_role,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const familyId = generateFamilyId();

    await authRepository.saveRefreshToken({
      userId: user._id,
      tokenHash: refreshTokenHash,
      familyId,
      expiresAt: getRefreshTokenExpiryDate(),
      deviceFingerprint,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();

