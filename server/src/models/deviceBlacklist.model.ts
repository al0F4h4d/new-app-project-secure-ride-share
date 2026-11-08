import mongoose, { Schema, Document, Model } from 'mongoose';
import { BanTypes, BanType } from '../common/constants/roles.constant';

export interface IDeviceBlacklist extends Document {
  imei_hash: string;
  android_id: string;
  nid_hash: string;
  license_hash: string;
  facial_vector_hash: string;
  integrity_verdict: string;
  ban_type: BanType;
  ban_reason: string;
  banned_by_admin_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
}

export const DeviceBlacklistSchema = new Schema<IDeviceBlacklist>(
  {
    imei_hash: {
      type: String,
      required: true,
    },
    android_id: {
      type: String,
      required: true,
    },
    nid_hash: {
      type: String,
      required: true,
    },
    license_hash: {
      type: String,
      required: true,
    },
    facial_vector_hash: {
      type: String,
      required: true,
    },
    integrity_verdict: {
      type: String,
      required: true,
    },
    ban_type: {
      type: String,
      enum: Object.values(BanTypes),
      required: true,
    },
    ban_reason: {
      type: String,
      required: true,
      trim: true,
    },
    banned_by_admin_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'device_blacklists',
  }
);

// Indexes
DeviceBlacklistSchema.index({ imei_hash: 1 }, { name: 'idx_ban_imei' });
DeviceBlacklistSchema.index({ android_id: 1 }, { name: 'idx_ban_android_id' });
DeviceBlacklistSchema.index({ nid_hash: 1 }, { name: 'idx_ban_nid' });
DeviceBlacklistSchema.index({ facial_vector_hash: 1 }, { name: 'idx_ban_face_hash' });

export const DeviceBlacklist: Model<IDeviceBlacklist> = mongoose.model<IDeviceBlacklist>(
  'DeviceBlacklist',
  DeviceBlacklistSchema
);
