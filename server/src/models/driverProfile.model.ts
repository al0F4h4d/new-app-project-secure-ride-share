import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  DriverVerificationStatuses,
  DriverVerificationStatus,
  LicenseCategories,
  LicenseCategory,
  CommissionPassTypes,
  CommissionPassType,
} from '../common/constants/roles.constant';

export interface IDriverProfile extends Document {
  user_id: mongoose.Types.ObjectId;
  nid_number?: string | null;
  nid_document_front_url?: string | null;
  nid_document_back_url?: string | null;
  license_number?: string | null;
  license_category?: LicenseCategory | null;
  license_expiry_date?: Date | null;
  license_document_url?: string | null;
  live_selfie_url?: string | null;
  facial_vector_hash?: string | null;
  verification_status: DriverVerificationStatus;
  failed_verification_attempts: number;
  lockout_until?: Date | null;
  bkash_payout_number?: string | null;
  nagad_payout_number?: string | null;
  current_wallet_balance: mongoose.Types.Decimal128;
  active_vehicle_id?: mongoose.Types.ObjectId | null;
  commission_pass_active: boolean;
  commission_pass_type?: CommissionPassType | null;
  commission_pass_expiry?: Date | null;
  cancellation_count_7d: number;
  total_offers_7d: number;
  deprioritized_until?: Date | null;
  vehicle_mismatch_count: number;
  offline_collusion_strikes: number;
  suspended_until?: Date | null;
  is_permanently_banned: boolean;
  created_at: Date;
  updated_at: Date;
}

export const DriverProfileSchema = new Schema<IDriverProfile>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    nid_number: {
      type: String,
      required: false,
      default: null,
      trim: true,
      validate: {
        validator: (val: string | null) => !val || /^\d{10}$|^\d{17}$/.test(val),
        message: 'Smart NID must be 10 or 17 digits',
      },
    },
    nid_document_front_url: {
      type: String,
      default: null,
    },
    nid_document_back_url: {
      type: String,
      default: null,
    },
    license_number: {
      type: String,
      default: null,
      trim: true,
    },
    license_category: {
      type: String,
      enum: [...Object.values(LicenseCategories), null],
      default: null,
    },
    license_expiry_date: {
      type: Date,
      default: null,
      validate: {
        validator: (val: Date | null) => !val || val > new Date(),
        message: 'Driving license expiry date must be in the future',
      },
    },
    license_document_url: {
      type: String,
      default: null,
    },
    live_selfie_url: {
      type: String,
      default: null,
    },
    facial_vector_hash: {
      type: String,
      default: null,
      validate: {
        validator: (val: string | null) => !val || val.length === 64,
        message: 'Facial vector hash must be 64 characters',
      },
    },
    verification_status: {
      type: String,
      enum: Object.values(DriverVerificationStatuses),
      default: DriverVerificationStatuses.PENDING,
    },
    failed_verification_attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockout_until: {
      type: Date,
      default: null,
    },
    bkash_payout_number: {
      type: String,
      default: null,
      validate: {
        validator: (val: string | null) => !val || /^(?:\+8801|01)[3-9]\d{8}$/.test(val),
        message: 'Must be a valid Bangladeshi bKash number',
      },
    },
    nagad_payout_number: {
      type: String,
      default: null,
      validate: {
        validator: (val: string | null) => !val || /^(?:\+8801|01)[3-9]\d{8}$/.test(val),
        message: 'Must be a valid Bangladeshi Nagad number',
      },
    },
    current_wallet_balance: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
      validate: {
        validator: (val: mongoose.Types.Decimal128) => {
          return parseFloat(val.toString()) >= -500.0;
        },
        message: 'Driver wallet debt cannot exceed -500.00 BDT',
      },
    },
    active_vehicle_id: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    commission_pass_active: {
      type: Boolean,
      default: false,
    },
    commission_pass_type: {
      type: String,
      enum: [...Object.values(CommissionPassTypes), null],
      default: null,
    },
    commission_pass_expiry: {
      type: Date,
      default: null,
    },
    cancellation_count_7d: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_offers_7d: {
      type: Number,
      default: 0,
      min: 0,
    },
    deprioritized_until: {
      type: Date,
      default: null,
    },
    vehicle_mismatch_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    offline_collusion_strikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    suspended_until: {
      type: Date,
      default: null,
    },
    is_permanently_banned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'driver_profiles',
  }
);

// Indexes
DriverProfileSchema.index({ user_id: 1 }, { unique: true, name: 'uniq_driver_user_id' });
DriverProfileSchema.index({ license_number: 1 }, { unique: true, sparse: true, name: 'uniq_license_number' });
DriverProfileSchema.index({ nid_number: 1 }, { sparse: true, name: 'idx_nid_number' });
DriverProfileSchema.index({ verification_status: 1 }, { name: 'idx_verification_status' });
DriverProfileSchema.index({ facial_vector_hash: 1 }, { sparse: true, name: 'idx_driver_face_hash' });
DriverProfileSchema.index({ active_vehicle_id: 1 }, { name: 'idx_active_vehicle_id' });
DriverProfileSchema.index({ deprioritized_until: 1 }, { sparse: true, name: 'idx_deprioritized' });

export const DriverProfile: Model<IDriverProfile> = mongoose.model<IDriverProfile>(
  'DriverProfile',
  DriverProfileSchema
);
