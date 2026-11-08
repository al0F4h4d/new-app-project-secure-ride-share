import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  PassengerWalletTransactionTypes,
  PassengerWalletTransactionType,
} from '../common/constants/roles.constant';

export interface IPassengerWalletTransaction extends Document {
  user_id: mongoose.Types.ObjectId;
  trip_id?: mongoose.Types.ObjectId | null;
  transaction_type: PassengerWalletTransactionType;
  amount: mongoose.Types.Decimal128;
  balance_before: mongoose.Types.Decimal128;
  balance_after: mongoose.Types.Decimal128;
  description: string;
  created_at: Date;
}

export const PassengerWalletTransactionSchema = new Schema<IPassengerWalletTransaction>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },
    transaction_type: {
      type: String,
      enum: Object.values(PassengerWalletTransactionTypes),
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    balance_before: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    balance_after: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    description: {
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
    collection: 'passenger_wallet_transactions',
  }
);

// Indexes
PassengerWalletTransactionSchema.index(
  { user_id: 1, created_at: -1 },
  { name: 'idx_passenger_ledger_chronological' }
);

export const PassengerWalletTransaction: Model<IPassengerWalletTransaction> =
  mongoose.model<IPassengerWalletTransaction>(
    'PassengerWalletTransaction',
    PassengerWalletTransactionSchema
  );
