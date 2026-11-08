import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  LoyaltyTransactionTypes,
  LoyaltyTransactionType,
} from '../common/constants/roles.constant';

export interface ILoyaltyTransaction extends Document {
  passenger_id: mongoose.Types.ObjectId;
  trip_id?: mongoose.Types.ObjectId | null;
  type: LoyaltyTransactionType;
  points_delta: number;
  balance_after: number;
  created_at: Date;
}

export const LoyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    passenger_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(LoyaltyTransactionTypes),
      required: true,
    },
    points_delta: {
      type: Number,
      required: true,
    },
    balance_after: {
      type: Number,
      required: true,
      min: 0,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'loyalty_transactions',
  }
);

// Indexes
LoyaltyTransactionSchema.index(
  { passenger_id: 1, created_at: -1 },
  { name: 'idx_loyalty_trx_passenger' }
);
LoyaltyTransactionSchema.index(
  { trip_id: 1 },
  { sparse: true, name: 'idx_loyalty_trx_trip' }
);

export const LoyaltyTransaction: Model<ILoyaltyTransaction> =
  mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', LoyaltyTransactionSchema);
