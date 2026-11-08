import mongoose, { ClientSession } from 'mongoose';
import crypto from 'crypto';
import { User, IUser } from '../../models/user.model';
import { DriverProfile, IDriverProfile } from '../../models/driverProfile.model';
import { NidBlacklist } from '../../models/nidBlacklist.model';
import { DeviceBlacklist } from '../../models/deviceBlacklist.model';
import { RefreshToken, IRefreshToken, IDeviceFingerprint } from '../../models/refreshToken.model';
import { hashDeterministic } from '../../common/utils/crypto.util';

export class AuthRepository {
  /**
   * Find user by phone number
   */
  async findUserByPhone(phone: string): Promise<IUser | null> {
    return User.findOne({ phone_number: phone });
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  /**
   * Check if NID is blacklisted
   */
  async isNidBlacklisted(nid: string): Promise<boolean> {
    const rawSha256 = crypto.createHash('sha256').update(nid.trim()).digest('hex');
    const deterministicHmac = hashDeterministic(nid.trim());

    const match = await NidBlacklist.findOne({
      $or: [{ nid_hash: rawSha256 }, { nid_hash: deterministicHmac }, { nid_hash: nid.trim() }],
    }).lean();

    return !!match;
  }

  /**
   * Check if device hardware identifiers are blacklisted
   */
  async isDeviceBlacklisted(imeiHash?: string, androidId?: string): Promise<boolean> {
    if (!imeiHash && !androidId) {
      return false;
    }

    const conditions: Array<{ imei_hash?: string; android_id?: string }> = [];
    if (imeiHash) conditions.push({ imei_hash: imeiHash });
    if (androidId) conditions.push({ android_id: androidId });

    const match = await DeviceBlacklist.findOne({
      $or: conditions,
    }).lean();

    return !!match;
  }

  /**
   * Atomically create user within transaction session if provided
   */
  async createUser(userData: Partial<IUser>, session?: ClientSession): Promise<IUser> {
    const user = new User(userData);
    return user.save({ session });
  }

  /**
   * Atomically create driver profile linked to user within transaction session
   */
  async createDriverProfile(
    profileData: Partial<IDriverProfile>,
    session?: ClientSession
  ): Promise<IDriverProfile> {
    const profile = new DriverProfile(profileData);
    return profile.save({ session });
  }

  /**
   * Find driver profile by user ID
   */
  async findDriverProfileByUserId(userId: string | mongoose.Types.ObjectId): Promise<IDriverProfile | null> {
    return DriverProfile.findOne({ user_id: userId });
  }

  /**
   * Save new refresh token entry in MongoDB
   */
  async saveRefreshToken(tokenData: {
    userId: mongoose.Types.ObjectId;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    deviceFingerprint?: IDeviceFingerprint | null;
  }): Promise<IRefreshToken> {
    return RefreshToken.create({
      user_id: tokenData.userId,
      token_hash: tokenData.tokenHash,
      family_id: tokenData.familyId,
      expires_at: tokenData.expiresAt,
      device_fingerprint: tokenData.deviceFingerprint,
      is_revoked: false,
    });
  }

  /**
   * Find refresh token record by token hash
   */
  async findRefreshTokenByHash(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({ token_hash: tokenHash });
  }

  /**
   * Revoke a single refresh token by ID
   */
  async revokeRefreshTokenById(id: mongoose.Types.ObjectId | string): Promise<void> {
    await RefreshToken.updateOne({ _id: id }, { is_revoked: true });
  }

  /**
   * Revoke entire token family upon reuse/theft detection
   */
  async revokeTokenFamily(familyId: string): Promise<number> {
    const result = await RefreshToken.updateMany({ family_id: familyId }, { is_revoked: true });
    return result.modifiedCount;
  }

  /**
   * Revoke all active sessions for a user (on logout or security breach)
   */
  async revokeAllUserTokens(userId: mongoose.Types.ObjectId | string): Promise<number> {
    const result = await RefreshToken.updateMany({ user_id: userId }, { is_revoked: true });
    return result.modifiedCount;
  }
}

export const authRepository = new AuthRepository();

