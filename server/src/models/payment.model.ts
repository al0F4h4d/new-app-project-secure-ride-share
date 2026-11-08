import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  PaymentMethods,
  PaymentMethod,
  PaymentStatuses,
  PaymentStatus,
} from '../common/constants/roles.constant';

export interface IPayment extends Document {
  trip_id: mongoose.Types.ObjectId;
  payer_user_id: mongoose.Types.ObjectId;
  payee_driver_id?: mongoose.Types.ObjectId | null;
  payment_method: PaymentMethod;
  gross_amount: mongoose.Types.Decimal128;
  wallet_discount_applied: mongoose.Types.Decimal128;
  net_amount_charged: mongoose.Types.Decimal128;
  status: PaymentStatus;
  external_transaction_id?: string | null;
  mfs_callback_payload?: string | null;
  initiated_at: Date;
  settled_at?: Date | null;
}

export const PaymentSchema = new Schema<IPayment>(
  {
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    payer_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    payee_driver_id: {
      type: Schema.Types.ObjectId,
      ref: 'DriverProfile',
      default: null,
    },
    payment_method: {
      type: String,
      enum: Object.values(PaymentMethods),
      required: true,
    },
    gross_amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    wallet_discount_applied: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },
    net_amount_charged: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatuses),
      default: PaymentStatuses.PENDING,
    },
    external_transaction_id: {
      type: String,
      default: null,
    },
    mfs_callback_payload: {
      type: String,
      default: null,
    },
    initiated_at: {
      type: Date,
      default: Date.now,
    },
    settled_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'payments',
  }
);

// Indexes
PaymentSchema.index({ trip_id: 1 }, { unique: true, name: 'uniq_payment_trip_id' });
PaymentSchema.index({ external_transaction_id: 1 }, { sparse: true, name: 'idx_external_trx_id' });
PaymentSchema.index({ status: 1, initiated_at: 1 }, { name: 'idx_payment_reconciliation' });

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);
