import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDeviceFingerprint {
  imei_hash?: string;
  android_id?: string;
  platform?: 'android' | 'ios' | 'web';
  app_version?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface IRefreshToken extends Document {
  user_id: mongoose.Types.ObjectId;
  token_hash: string;
  family_id: string;
  is_revoked: boolean;
  device_fingerprint?: IDeviceFingerprint | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token_hash: {
      type: String,
      required: true,
    },
    family_id: {
      type: String,
      required: true,
    },
    is_revoked: {
      type: Boolean,
      default: false,
    },
    device_fingerprint: {
      imei_hash: { type: String, default: null },
      android_id: { type: String, default: null },
      platform: { type: String, default: null },
      app_version: { type: String, default: null },
      ip_address: { type: String, default: null },
      user_agent: { type: String, default: null },
    },
    expires_at: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'refresh_tokens',
  }
);

RefreshTokenSchema.index({ token_hash: 1 }, { unique: true, name: 'uniq_refresh_token_hash' });
RefreshTokenSchema.index({ family_id: 1 }, { name: 'idx_refresh_token_family' });
RefreshTokenSchema.index({ user_id: 1 }, { name: 'idx_refresh_token_user' });
RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, name: 'idx_refresh_token_ttl' });

export const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  'RefreshToken',
  RefreshTokenSchema
);

