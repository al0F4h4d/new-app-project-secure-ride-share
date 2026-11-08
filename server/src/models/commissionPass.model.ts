import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  CommissionPassTypes,
  CommissionPassType,
} from '../common/constants/roles.constant';

export interface ICommissionPass extends Document {
  driver_id: mongoose.Types.ObjectId;
  pass_type: CommissionPassType;
  price_bdt: mongoose.Types.Decimal128;
  purchase_transaction_id: string;
  activated_at: Date;
  expires_at: Date;
  created_at: Date;
}

export const CommissionPassSchema = new Schema<ICommissionPass>(
  {
    driver_id: {
      type: Schema.Types.ObjectId,
      ref: 'DriverProfile',
      required: true,
    },
    pass_type: {
      type: String,
      enum: Object.values(CommissionPassTypes),
      required: true,
    },
    price_bdt: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    purchase_transaction_id: {
      type: String,
      required: true,
      trim: true,
    },
    activated_at: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'commission_passes',
  }
);

// Indexes
CommissionPassSchema.index(
  { driver_id: 1, expires_at: -1 },
  { name: 'idx_driver_active_pass' }
);

export const CommissionPass: Model<ICommissionPass> = mongoose.model<ICommissionPass>(
  'CommissionPass',
  CommissionPassSchema
);
