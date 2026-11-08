import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INidBlacklist extends Document {
  nid_hash: string;
  license_hash?: string | null;
  facial_vector_hash?: string | null;
  ban_reason: string;
  created_at: Date;
}

export const NidBlacklistSchema = new Schema<INidBlacklist>(
  {
    nid_hash: {
      type: String,
      required: true,
    },
    license_hash: {
      type: String,
      default: null,
    },
    facial_vector_hash: {
      type: String,
      default: null,
    },
    ban_reason: {
      type: String,
      required: true,
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'nid_blacklist',
  }
);

// Indexes
NidBlacklistSchema.index({ nid_hash: 1 }, { unique: true, name: 'uniq_banned_nid_hash' });

export const NidBlacklist: Model<INidBlacklist> = mongoose.model<INidBlacklist>(
  'NidBlacklist',
  NidBlacklistSchema
);
