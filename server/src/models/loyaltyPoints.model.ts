import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoyaltyPoints extends Document {
  passenger_id: mongoose.Types.ObjectId;
  points_balance: number;
  lifetime_points_earned: number;
  last_earned_at: Date;
  expires_after: Date;
  updated_at: Date;
}

export const LoyaltyPointsSchema = new Schema<ILoyaltyPoints>(
  {
    passenger_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    points_balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetime_points_earned: {
      type: Number,
      default: 0,
      min: 0,
    },
    last_earned_at: {
      type: Date,
      default: Date.now,
    },
    expires_after: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 Months
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
    collection: 'loyalty_points',
  }
);

// Indexes
LoyaltyPointsSchema.index(
  { passenger_id: 1 },
  { unique: true, name: 'uniq_loyalty_passenger' }
);
LoyaltyPointsSchema.index({ expires_after: 1 }, { name: 'idx_loyalty_expiry' });

export const LoyaltyPoints: Model<ILoyaltyPoints> = mongoose.model<ILoyaltyPoints>(
  'LoyaltyPoints',
  LoyaltyPointsSchema
);
