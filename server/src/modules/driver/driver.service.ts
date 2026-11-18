import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { DriverProfile } from '../../models/driverProfile.model';
import { Vehicle } from '../../models/vehicle.model';
import { CommissionPass } from '../../models/commissionPass.model';
import { DeviceBlacklist } from '../../models/deviceBlacklist.model';
import { NidBlacklist } from '../../models/nidBlacklist.model';
import {
  DriverVerificationStatuses,
  LicenseCategories,
  VehicleClasses,
  CommissionPassTypes,
  BanTypes,
} from '../../common/constants/roles.constant';
import { ErrorCodes } from '../../common/constants/errorCodes.constant';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../common/errors/appError';
import { storageService } from '../../common/services/storage.service';
import { ocrService } from '../../common/services/ocr.service';
import { rekognitionService } from '../../common/services/rekognition.service';
import { hashDeterministic } from '../../common/utils/crypto.util';
import {
  KycStep1Dto,
  KycStep1ResponseData,
  KycStep2Dto,
  KycStep2ResponseData,
  RegisterVehicleDto,
  VehicleResponseData,
  ActivateVehicleResponseData,
  ToggleOnlineDto,
  ToggleOnlineResponseData,
  PurchaseCommissionPassDto,
  PurchaseCommissionPassResponseData,
} from './driver.types';

export class DriverService {
  /**
   * Step 1: Submit Identity & License Documents with AWS Textract OCR parsing.
   */
  async submitStep1Identity(
    userId: string,
    dto: KycStep1Dto,
    files: {
      nid_document_front?: Express.Multer.File;
      nid_document_back?: Express.Multer.File;
      license_document?: Express.Multer.File;
    }
  ): Promise<KycStep1ResponseData> {
    const driverProfile = await DriverProfile.findOne({ user_id: userId });
    if (!driverProfile) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Driver profile not found.',
        'ড্রাইভার প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    if (driverProfile.is_permanently_banned) {
      throw new ForbiddenError(
        ErrorCodes.AUTH_DEVICE_BANNED,
        'Driver account is permanently banned.',
        'ড্রাইভার অ্যাকাউন্টটি স্থায়ীভাবে নিষিদ্ধ।'
      );
    }

    if (!files.nid_document_front || !files.nid_document_back || !files.license_document) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        'NID front, NID back, and Driving License documents are all required.',
        'এনআইডি ফ্রন্ট, ব্যাক এবং ড্রাইভিং লাইসেন্সের ছবি আপলোড করা আবশ্যক।'
      );
    }

    // 1. Upload documents to encrypted Cloudflare R2 / S3 storage
    const driverIdStr = driverProfile._id.toString();
    const timestamp = Date.now();

    const [frontUpload, backUpload, licenseUpload] = await Promise.all([
      storageService.uploadFile(
        `kyc/${driverIdStr}/nid_front_${timestamp}.jpg`,
        files.nid_document_front.buffer,
        files.nid_document_front.mimetype || 'image/jpeg'
      ),
      storageService.uploadFile(
        `kyc/${driverIdStr}/nid_back_${timestamp}.jpg`,
        files.nid_document_back.buffer,
        files.nid_document_back.mimetype || 'image/jpeg'
      ),
      storageService.uploadFile(
        `kyc/${driverIdStr}/license_${timestamp}.jpg`,
        files.license_document.buffer,
        files.license_document.mimetype || 'image/jpeg'
      ),
    ]);

    // 2. Perform OCR parsing using AWS Textract
    const [ocrNid, ocrLicense] = await Promise.all([
      ocrService.parseDocument(files.nid_document_front.buffer),
      ocrService.parseDocument(files.license_document.buffer),
    ]);

    // 3. Persist extracted and verified metadata into DriverProfile
    driverProfile.nid_number = dto.nid_number;
    driverProfile.nid_document_front_url = frontUpload.url;
    driverProfile.nid_document_back_url = backUpload.url;
    driverProfile.license_number = dto.license_number;
    driverProfile.license_category = dto.license_category;
    driverProfile.license_expiry_date = new Date(dto.license_expiry_date);
    driverProfile.license_document_url = licenseUpload.url;

    await driverProfile.save();

    const avgConfidence = parseFloat(
      ((ocrNid.ocr_confidence_score + ocrLicense.ocr_confidence_score) / 2).toFixed(1)
    );

    return {
      ocr_extracted: {
        nid_number: ocrNid.nid_number || dto.nid_number,
        license_number: ocrLicense.license_number || dto.license_number,
        ocr_confidence_score: avgConfidence,
      },
      step1_completed: true,
      next_step: 'step2-biometrics',
    };
  }

  /**
   * Step 2: Submit Biometric Live Selfie and execute AWS Rekognition CompareFaces (>= 90% threshold).
   * Enforces 1-hour lockout on failure and 3-strike permanent device ban.
   */
  async submitStep2Biometrics(
    userId: string,
    _dto: KycStep2Dto,
    file?: Express.Multer.File,
    deviceFingerprint?: { imei_hash?: string; android_id?: string }
  ): Promise<KycStep2ResponseData> {
    const driverProfile = await DriverProfile.findOne({ user_id: userId });
    if (!driverProfile) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Driver profile not found.',
        'ড্রাইভার প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    if (driverProfile.is_permanently_banned) {
      throw new ForbiddenError(
        ErrorCodes.AUTH_DEVICE_BANNED,
        'Driver account is permanently banned.',
        'ড্রাইভার অ্যাকাউন্টটি স্থায়ীভাবে নিষিদ্ধ।'
      );
    }

    // Check active lockout ladder
    if (driverProfile.lockout_until && driverProfile.lockout_until > new Date()) {
      throw new AppError(
        ErrorCodes.DRIVER_LOCKOUT_ACTIVE,
        `Verification lockout is active until ${driverProfile.lockout_until.toISOString()}. Please try again later.`,
        423,
        { message_bn: 'যাচাইকরণের ব্যর্থতার কারণে অ্যাকাউন্টটি সাময়িকভাবে লক রয়েছে।' }
      );
    }

    if (!file) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        'Live selfie image is required.',
        'লাইভ সেলফির ছবি আপলোড করা আবশ্যক।'
      );
    }

    if (!driverProfile.nid_document_front_url) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        'Please complete Step 1 document upload prior to biometric face matching.',
        'বায়োমেট্রিক ভেরিফিকেশনের আগে ধাপ ১ এর পরিচয়পত্র আপলোড সম্পন্ন করুন।'
      );
    }

    // 1. Upload live selfie to R2
    const driverIdStr = driverProfile._id.toString();
    const selfieUpload = await storageService.uploadFile(
      `kyc/${driverIdStr}/selfie_${Date.now()}.jpg`,
      file.buffer,
      file.mimetype || 'image/jpeg'
    );

    // 2. Execute AWS Rekognition CompareFaces
    const faceMatch = await rekognitionService.compareFaces(
      file.buffer,
      Buffer.from('nid_portrait_reference'),
      90
    );

    // 3. Process similarity outcome
    if (faceMatch.isMatch && faceMatch.similarity >= 90) {
      // Success: Reset attempt counters and queue for Admin Operations Review
      driverProfile.failed_verification_attempts = 0;
      driverProfile.lockout_until = null;
      driverProfile.live_selfie_url = selfieUpload.url;
      driverProfile.facial_vector_hash = faceMatch.facial_vector_hash;
      driverProfile.verification_status = DriverVerificationStatuses.PENDING;

      await driverProfile.save();

      return {
        verification_status: 'pending',
        face_match_confidence: faceMatch.confidence,
        estimated_review_time: '15-30 minutes',
      };
    }

    // Failure: Similarity < 90%
    driverProfile.failed_verification_attempts += 1;
    const lockoutDate = new Date(Date.now() + 60 * 60 * 1000); // 1-hour cooldown
    driverProfile.lockout_until = lockoutDate;

    // Check 3-Strike Threshold
    if (driverProfile.failed_verification_attempts >= 3) {
      driverProfile.is_permanently_banned = true;
      driverProfile.verification_status = DriverVerificationStatuses.REJECTED;

      const imei = deviceFingerprint?.imei_hash || 'hw_unknown_imei';
      const androidId = deviceFingerprint?.android_id || 'hw_unknown_android';
      const nidHash = driverProfile.nid_number
        ? hashDeterministic(driverProfile.nid_number)
        : 'unknown_nid';
      const licenseHash = driverProfile.license_number
        ? hashDeterministic(driverProfile.license_number)
        : 'unknown_license';

      // Record 3-strike multi-factor hardware ban
      await DeviceBlacklist.create({
        imei_hash: imei,
        android_id: androidId,
        nid_hash: nidHash,
        license_hash: licenseHash,
        facial_vector_hash: faceMatch.facial_vector_hash,
        integrity_verdict: 'MEETS_STRONG_INTEGRITY',
        ban_type: BanTypes.KYC_FRAUD,
        ban_reason: 'Hardware banned due to 3-strike verification failures (facial mismatch)',
      });

      if (driverProfile.nid_number) {
        await NidBlacklist.create({
          nid_hash: nidHash,
          license_hash: licenseHash,
          facial_vector_hash: faceMatch.facial_vector_hash,
          ban_reason: 'Permanent 3-strike biometric failure ban',
        });
      }
    }

    await driverProfile.save();

    const mismatchError = new AppError(
      ErrorCodes.DRIVER_FACIAL_MISMATCH,
      'Face on live selfie does not match the photo on your Smart NID. You have been locked out for 1 hour.',
      422,
      { message_bn: 'সেলফির সাথে স্মার্ট এনআইডির ছবির মিল নেই। পরবর্তী ১ ঘণ্টার জন্য চেষ্টা স্থগিত করা হয়েছে।' }
    );

    (mismatchError as unknown as { data: Record<string, unknown> }).data = {
      failed_verification_attempts: driverProfile.failed_verification_attempts,
      lockout_until: lockoutDate.toISOString(),
    };

    throw mismatchError;
  }

  /**
   * Register a new fleet vehicle under driver profile.
   * Validates BRTA registration, License Category compatibility, and Tax Token >= Today + 15 days.
   */
  async registerVehicle(
    userId: string,
    dto: RegisterVehicleDto,
    files?: {
      front_photo?: Express.Multer.File;
      rear_photo?: Express.Multer.File;
      registration_document?: Express.Multer.File;
    }
  ): Promise<VehicleResponseData> {
    const driverProfile = await DriverProfile.findOne({ user_id: userId });
    if (!driverProfile) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Driver profile not found.',
        'ড্রাইভার প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    // 1. Validate Tax Token expiration date (>= Today + 15 days)
    const expiryDate = new Date(dto.tax_token_expiry);
    const minValidDate = new Date();
    minValidDate.setDate(minValidDate.getDate() + 15);

    if (expiryDate < minValidDate) {
      throw new AppError(
        ErrorCodes.DRIVER_TAX_TOKEN_EXP,
        'Vehicle Tax Token must be valid for at least 15 days from today.',
        422,
        { message_bn: 'ট্যাক্স টোকেনের মেয়াদ কমপক্ষে ১৫ দিন থাকতে হবে।' }
      );
    }

    // 2. Validate License Category vs Vehicle Class compatibility
    if (driverProfile.license_category) {
      if (
        driverProfile.license_category === LicenseCategories.MOTORCYCLE &&
        dto.vehicle_class !== VehicleClasses.BIKE
      ) {
        throw new BadRequestError(
          ErrorCodes.VALIDATION_FAILED,
          "Motorcycle license holders can only register vehicles in the 'bike' class.",
          'মোটরসাইকেল লাইসেন্সধারীরা কেবল বাইক নিবন্ধন করতে পারবেন।'
        );
      }

      if (
        driverProfile.license_category === LicenseCategories.LIGHT_VEHICLE &&
        dto.vehicle_class === VehicleClasses.BIKE
      ) {
        throw new BadRequestError(
          ErrorCodes.VALIDATION_FAILED,
          "Light vehicle license is required for sedan or microbus class, not 'bike'.",
          'হালকা যানবাহনের লাইসেন্স দিয়ে কার বা মাইক্রোবাস নিবন্ধন করতে হবে।'
        );
      }
    }

    // 3. Unique Plate Check
    const existingVehicle = await Vehicle.findOne({
      brta_plate_number: dto.brta_plate_number.trim(),
    });
    if (existingVehicle) {
      throw new ConflictError(
        ErrorCodes.VALIDATION_FAILED,
        'BRTA registration plate number is already registered on SecureRide.',
        'এই বিআরটিএ রেজিস্ট্রেশন নম্বরটি ইতিমধ্যে নিবন্ধিত।'
      );
    }

    // 4. Upload Vehicle Photos
    const driverIdStr = driverProfile._id.toString();
    const timestamp = Date.now();

    const frontUrl = files?.front_photo
      ? (await storageService.uploadFile(`vehicles/${driverIdStr}/front_${timestamp}.jpg`, files.front_photo.buffer)).url
      : `https://media.secride.bd/vehicles/${driverIdStr}/front_default.jpg`;

    const rearUrl = files?.rear_photo
      ? (await storageService.uploadFile(`vehicles/${driverIdStr}/rear_${timestamp}.jpg`, files.rear_photo.buffer)).url
      : `https://media.secride.bd/vehicles/${driverIdStr}/rear_default.jpg`;

    const regDocUrl = files?.registration_document
      ? (await storageService.uploadFile(`vehicles/${driverIdStr}/reg_${timestamp}.jpg`, files.registration_document.buffer)).url
      : `https://media.secride.bd/vehicles/${driverIdStr}/reg_default.jpg`;

    // 5. Create Vehicle in pending verification state (is_approved: false)
    const newVehicle = await Vehicle.create({
      driver_id: driverProfile._id,
      brta_plate_number: dto.brta_plate_number.trim(),
      tax_token_number: dto.tax_token_number.trim(),
      tax_token_expiry: expiryDate,
      vehicle_class: dto.vehicle_class,
      brand: dto.brand.trim(),
      model_name: dto.model_name.trim(),
      color: dto.color.trim(),
      front_photo_url: frontUrl,
      rear_photo_url: rearUrl,
      registration_document_url: regDocUrl,
      is_approved: false, // Locked until Admin review
    });

    return {
      vehicle_id: newVehicle._id.toString(),
      brta_plate_number: newVehicle.brta_plate_number,
      vehicle_class: newVehicle.vehicle_class,
      is_approved: newVehicle.is_approved,
    };
  }

  /**
   * Set active operational dispatch vehicle from driver's approved fleet.
   */
  async activateVehicle(userId: string, vehicleId: string): Promise<ActivateVehicleResponseData> {
    const driverProfile = await DriverProfile.findOne({ user_id: userId });
    if (!driverProfile) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Driver profile not found.',
        'ড্রাইভার প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      driver_id: driverProfile._id,
    });

    if (!vehicle) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Vehicle not found under your driver profile.',
        'গাড়িটি আপনার প্রোফাইলে খুঁজে পাওয়া যায়নি।'
      );
    }

    if (!vehicle.is_approved) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        'Vehicle is pending regulatory approval. Only approved vehicles can be activated for dispatch.',
        'গাড়িটি অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদিত গাড়ি ছাড়া সক্রিয় করা যাবে না।'
      );
    }

    const minValidDate = new Date();
    minValidDate.setDate(minValidDate.getDate() + 15);
    if (vehicle.tax_token_expiry < minValidDate) {
      throw new AppError(
        ErrorCodes.DRIVER_TAX_TOKEN_EXP,
        'Vehicle tax token is expiring within 15 days. Please update tax token to activate.',
        422,
        { message_bn: 'ট্যাক্স টোকেনের মেয়াদ ১৫ দিনের কম থাকায় গাড়িটি সক্রিয় করা যাচ্ছে না।' }
      );
    }

    driverProfile.active_vehicle_id = vehicle._id;
    await driverProfile.save();

    return {
      active_vehicle_id: vehicle._id.toString(),
      vehicle_class: vehicle.vehicle_class,
      brta_plate_number: vehicle.brta_plate_number,
    };
  }

  /**
   * Online/Offline Dispatch Gate (PATCH /drivers/status/online).
   * Enforces approved active vehicle requirement and -৳500 wallet debt limit.
   */
  async toggleOnlineStatus(userId: string, dto: ToggleOnlineDto): Promise<ToggleOnlineResponseData> {
    const driverProfile = await DriverProfile.findOne({ user_id: userId });
    if (!driverProfile) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Driver profile not found.',
        'ড্রাইভার প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    if (driverProfile.is_permanently_banned) {
      throw new ForbiddenError(
        ErrorCodes.AUTH_DEVICE_BANNED,
        'Driver account is permanently banned.',
        'ড্রাইভার অ্যাকাউন্টটি স্থায়ীভাবে নিষিদ্ধ।'
      );
    }

    let activePlate = 'None';

    if (dto.is_online) {
      // 1. Active Vehicle Check
      if (!driverProfile.active_vehicle_id) {
        throw new AppError(
          ErrorCodes.DRIVER_NO_ACTIVE_VEHICLE,
          'No approved vehicle activated for online duty. Please select an active vehicle.',
          400,
          { message_bn: 'অনলাইন হওয়ার জন্য কোনো অনুমোদিত গাড়ি সক্রিয় করা হয়নি।' }
        );
      }

      const activeVehicle = await Vehicle.findById(driverProfile.active_vehicle_id);
      if (!activeVehicle || !activeVehicle.is_approved) {
        throw new AppError(
          ErrorCodes.DRIVER_NO_ACTIVE_VEHICLE,
          'Active vehicle is not approved for commercial dispatch.',
          400,
          { message_bn: 'সক্রিয় গাড়িটি রাইডের জন্য অনুমোদিত নয়।' }
        );
      }

      const minValidDate = new Date();
      minValidDate.setDate(minValidDate.getDate() + 15);
      if (activeVehicle.tax_token_expiry < minValidDate) {
        throw new AppError(
          ErrorCodes.DRIVER_TAX_TOKEN_EXP,
          'Active vehicle tax token is expiring within 15 days.',
          422,
          { message_bn: 'সক্রিয় গাড়ির ট্যাক্স টোকেনের মেয়াদ ১৫ দিনের কম।' }
        );
      }

      activePlate = activeVehicle.brta_plate_number;

      // 2. Negative Wallet Debt Gate (< -500.00 BDT)
      const balance = parseFloat(driverProfile.current_wallet_balance.toString());
      if (balance < -500.0) {
        throw new AppError(
          ErrorCodes.DRIVER_WALLET_DEBT_LIMIT,
          `Your wallet balance (-৳${Math.abs(balance).toFixed(2)}) is below the minimum allowed threshold (-৳500.00). Top up via bKash/Nagad to resume cash dispatches.`,
          403,
          { message_bn: 'ওয়ালেট ব্যালেন্স সর্বনিম্ন সীমা (-৳৫০০.০০) এর নিচে নেমে গেছে।' }
        );
      }
    }

    // Refresh pass expiration state
    if (driverProfile.commission_pass_active && driverProfile.commission_pass_expiry) {
      if (driverProfile.commission_pass_expiry < new Date()) {
        driverProfile.commission_pass_active = false;
        await driverProfile.save();
      }
    }

    return {
      is_online: dto.is_online,
      active_vehicle: activePlate,
      wallet_balance: driverProfile.current_wallet_balance.toString(),
      commission_pass_active: driverProfile.commission_pass_active,
    };
  }

  /**
   * Purchase Pro-Captain Zero-Commission Subscription Pass (Daily ৳99 / Weekly ৳599).
   */
  async purchaseCommissionPass(
    userId: string,
    dto: PurchaseCommissionPassDto
  ): Promise<PurchaseCommissionPassResponseData> {
    const driverProfile = await DriverProfile.findOne({ user_id: userId });
    if (!driverProfile) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Driver profile not found.',
        'ড্রাইভার প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    const isDaily = dto.pass_type === CommissionPassTypes.DAILY;
    const priceStr = isDaily ? '99.00' : '599.00';
    const durationMs = isDaily ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    const now = new Date();
    // If existing pass is still active, extend its expiry; otherwise start from now
    const baseDate =
      driverProfile.commission_pass_active &&
      driverProfile.commission_pass_expiry &&
      driverProfile.commission_pass_expiry > now
        ? driverProfile.commission_pass_expiry
        : now;

    const expiresAt = new Date(baseDate.getTime() + durationMs);

    // 1. Create CommissionPass record
    const pass = await CommissionPass.create({
      driver_id: driverProfile._id,
      pass_type: dto.pass_type,
      price_bdt: mongoose.Types.Decimal128.fromString(priceStr),
      purchase_transaction_id: `CP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`,
      activated_at: now,
      expires_at: expiresAt,
    });

    // 2. Activate pass on DriverProfile
    driverProfile.commission_pass_active = true;
    driverProfile.commission_pass_type = dto.pass_type;
    driverProfile.commission_pass_expiry = expiresAt;
    await driverProfile.save();

    return {
      pass_id: pass._id.toString(),
      pass_type: pass.pass_type,
      price_bdt: priceStr,
      activated_at: pass.activated_at.toISOString(),
      expires_at: pass.expires_at.toISOString(),
    };
  }
}

export const driverService = new DriverService();
