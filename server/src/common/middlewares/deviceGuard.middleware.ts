import { Request, Response, NextFunction } from 'express';
import { DeviceBlacklist } from '../../models/deviceBlacklist.model';
import { ForbiddenError } from '../errors/appError';
import { ErrorCodes } from '../constants/errorCodes.constant';

/**
 * Middleware: Checks hardware identifiers against DEVICE_BLACKLISTS.
 * Rejects banned hardware with 403 AUTH_DEVICE_BANNED.
 */
export const deviceGuard = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const imeiHash =
      (req.headers['x-imei-hash'] as string) ||
      req.body?.device_fingerprint?.imei_hash ||
      req.body?.imei_hash;

    const androidId =
      (req.headers['x-android-id'] as string) ||
      req.body?.device_fingerprint?.android_id ||
      req.body?.android_id;

    if (!imeiHash && !androidId) {
      return next();
    }

    const conditions: Array<{ imei_hash?: string; android_id?: string }> = [];
    if (imeiHash) {
      conditions.push({ imei_hash: imeiHash });
    }
    if (androidId) {
      conditions.push({ android_id: androidId });
    }

    const bannedRecord = await DeviceBlacklist.findOne({
      $or: conditions,
    }).lean();

    if (bannedRecord) {
      throw new ForbiddenError(
        ErrorCodes.AUTH_DEVICE_BANNED,
        `Device is permanently blacklisted. Reason: ${bannedRecord.ban_reason}`,
        'প্ল্যাটফর্মের নিয়ম ভঙ্গের কারণে ডিভাইসটি নিষিদ্ধ।'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

