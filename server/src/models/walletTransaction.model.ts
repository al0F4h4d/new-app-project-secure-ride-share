import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  WalletTransactionTypes,
  WalletTransactionType,
  LedgerEntryTypes,
  LedgerEntryType,
} from '../common/constants/roles.constant';

export interface IWalletTransaction extends Document {
  driver_id: mongoose.Types.ObjectId;
  trip_id?: mongoose.Types.ObjectId | null;
  transaction_type: WalletTransactionType;
  entry_type: LedgerEntryType;
  amount: mongoose.Types.Decimal128;
  balance_before: mongoose.Types.Decimal128;
  balance_after: mongoose.Types.Decimal128;
  status: 'pending' | 'settled' | 'failed';
  external_trx_id?: string | null;
  notes: string;
  created_at: Date;
}

export const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    driver_id: {
      type: Schema.Types.ObjectId,
      ref: 'DriverProfile',
      required: true,
    },
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },
    transaction_type: {
      type: String,
      enum: Object.values(WalletTransactionTypes),
      required: true,
    },
    entry_type: {
      type: String,
      enum: Object.values(LedgerEntryTypes),
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: (val: mongoose.Types.Decimal128) => parseFloat(val.toString()) > 0,
        message: 'Transaction amount must be positive',
      },
    },
    balance_before: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    balance_after: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'settled', 'failed'],
      default: 'settled',
    },
    external_trx_id: {
      type: String,
      default: null,
    },
    notes: {
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
    collection: 'wallet_transactions',
  }
);

// Indexes
WalletTransactionSchema.index(
  { driver_id: 1, created_at: -1 },
  { name: 'idx_driver_ledger_chronological' }
);
WalletTransactionSchema.index(
  { external_trx_id: 1 },
  { sparse: true, name: 'idx_wallet_external_trx' }
);

export const WalletTransaction: Model<IWalletTransaction> = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  WalletTransactionSchema
);
