import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRoles, UserRole, AdminSubRoles, AdminSubRole, DeletionStatuses, DeletionStatus } from '../common/constants/roles.constant';

export interface IEmergencyContact {
  name: string;
  phone_number: string;
  relationship: string;
}

export interface ISavedAddress {
  label: 'Home' | 'Work' | 'Other';
  address_text: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface IUser extends Document {
  phone_number: string;
  email?: string | null;
  password_hash: string;
  role: UserRole;
  admin_sub_role?: AdminSubRole | null;
  full_name: string;
  profile_photo_url?: string | null;
  emergency_contacts: IEmergencyContact[];
  saved_addresses: ISavedAddress[];
  passenger_wallet_balance: mongoose.Types.Decimal128;
  rating_avg: number;
  total_ratings_count: number;
  language_preference: 'bn' | 'en';
  fcm_tokens: string[];
  deletion_status: DeletionStatus;
  deletion_requested_at?: Date | null;
  scheduled_deletion_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    phone_number: {
      type: String,
      required: true,
      match: [/^(?:\+8801|01)[3-9]\d{8}$/, 'Must be a valid Bangladeshi phone number'],
    },
    relationship: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const SavedAddressSchema = new Schema<ISavedAddress>(
  {
    label: { type: String, enum: ['Home', 'Work', 'Other'], required: true },
    address_text: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords: number[]) => coords.length === 2,
          message: 'Coordinates must be an array of 2 numbers [longitude, latitude]',
        },
      },
    },
  },
  { _id: false }
);

export const UserSchema = new Schema<IUser>(
  {
    phone_number: {
      type: String,
      required: true,
      trim: true,
      match: [/^(?:\+8801|01)[3-9]\d{8}$/, 'Must be a valid Bangladeshi phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    password_hash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRoles),
      required: true,
      default: UserRoles.PASSENGER,
    },
    admin_sub_role: {
      type: String,
      enum: [...Object.values(AdminSubRoles), null],
      default: null,
    },
    full_name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 80,
      trim: true,
    },
    profile_photo_url: {
      type: String,
      default: null,
    },
    emergency_contacts: {
      type: [EmergencyContactSchema],
      default: [],
      validate: [
        (val: IEmergencyContact[]) => val.length <= 3,
        'A maximum of 3 emergency contacts can be configured',
      ],
    },
    saved_addresses: {
      type: [SavedAddressSchema],
      default: [],
    },
    passenger_wallet_balance: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },
    rating_avg: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    total_ratings_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    language_preference: {
      type: String,
      enum: ['bn', 'en'],
      default: 'bn',
    },
    fcm_tokens: {
      type: [String],
      default: [],
    },
    deletion_status: {
      type: String,
      enum: Object.values(DeletionStatuses),
      default: DeletionStatuses.ACTIVE,
    },
    deletion_requested_at: {
      type: Date,
      default: null,
    },
    scheduled_deletion_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users',
  }
);

// Indexes
UserSchema.index({ phone_number: 1 }, { unique: true, name: 'uniq_phone_number' });
UserSchema.index({ email: 1 }, { unique: true, sparse: true, name: 'uniq_sparse_email' });
UserSchema.index({ role: 1, admin_sub_role: 1 }, { name: 'idx_role_admin_sub_role' });
UserSchema.index({ scheduled_deletion_at: 1 }, { sparse: true, name: 'idx_scheduled_deletion' });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
