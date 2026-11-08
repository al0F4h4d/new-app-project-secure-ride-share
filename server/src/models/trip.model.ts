import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  RideStatuses,
  RideStatus,
  VehicleClasses,
  VehicleClass,
  PaymentMethods,
  PaymentMethod,
} from '../common/constants/roles.constant';

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface IRouteBreadcrumb {
  location: IGeoPoint;
  altitude_m: number;
  speed: number;
  timestamp: Date;
}

export interface ICancellationMetadata {
  canceled_by?: 'passenger' | 'driver' | 'system' | null;
  reason?: string | null;
  fee_charged: mongoose.Types.Decimal128;
  timestamp: Date;
}

export interface ISosEvent {
  triggered_by: 'passenger' | 'driver';
  triggered_at: Date;
  audio_recording_url?: string | null;
  resolved_at?: Date | null;
  resolution_notes?: string | null;
}

export interface ITrip extends Document {
  trip_code: string;
  passenger_id: mongoose.Types.ObjectId;
  driver_id?: mongoose.Types.ObjectId | null;
  vehicle_id?: mongoose.Types.ObjectId | null;
  pickup_address: string;
  pickup_geo: IGeoPoint;
  dropoff_address: string;
  dropoff_geo: IGeoPoint;
  status: RideStatus;
  vehicle_class: VehicleClass;
  upfront_fare: mongoose.Types.Decimal128;
  surge_multiplier: number;
  payment_method: PaymentMethod;
  special_request?: string | null;
  pickup_otp_hash: string;
  rescue_ride: boolean;
  route_breadcrumbs: IRouteBreadcrumb[];
  cancellation_metadata?: ICancellationMetadata;
  sos_events: ISosEvent[];
  insurance_policy_id?: string | null;
  passenger_rating?: number | null;
  passenger_review_tags: string[];
  driver_rating?: number | null;
  driver_review_tags: string[];
  started_at?: Date | null;
  completed_at?: Date | null;
  created_at: Date;
}

const GeoPointSchema = new Schema<IGeoPoint>(
  {
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
        validator: (val: number[]) => val.length === 2,
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

const RouteBreadcrumbSchema = new Schema<IRouteBreadcrumb>(
  {
    location: {
      type: GeoPointSchema,
      required: true,
    },
    altitude_m: {
      type: Number,
      required: true,
      default: 0.0,
    },
    speed: {
      type: Number,
      required: true,
      default: 0.0,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const CancellationMetadataSchema = new Schema<ICancellationMetadata>(
  {
    canceled_by: {
      type: String,
      enum: ['passenger', 'driver', 'system', null],
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    fee_charged: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const SosEventSchema = new Schema<ISosEvent>(
  {
    triggered_by: {
      type: String,
      enum: ['passenger', 'driver'],
      required: true,
    },
    triggered_at: {
      type: Date,
      default: Date.now,
    },
    audio_recording_url: {
      type: String,
      default: null,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
    resolution_notes: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

export const TripSchema = new Schema<ITrip>(
  {
    trip_code: {
      type: String,
      required: true,
      trim: true,
    },
    passenger_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver_id: {
      type: Schema.Types.ObjectId,
      ref: 'DriverProfile',
      default: null,
    },
    vehicle_id: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    pickup_address: {
      type: String,
      required: true,
      trim: true,
    },
    pickup_geo: {
      type: GeoPointSchema,
      required: true,
    },
    dropoff_address: {
      type: String,
      required: true,
      trim: true,
    },
    dropoff_geo: {
      type: GeoPointSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RideStatuses),
      required: true,
      default: RideStatuses.REQUESTED,
    },
    vehicle_class: {
      type: String,
      enum: Object.values(VehicleClasses),
      required: true,
    },
    upfront_fare: {
      type: Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: (val: mongoose.Types.Decimal128) => parseFloat(val.toString()) >= 0,
        message: 'Upfront fare cannot be negative',
      },
    },
    surge_multiplier: {
      type: Number,
      required: true,
      default: 1.0,
      min: 1.0,
      max: 1.5,
    },
    payment_method: {
      type: String,
      enum: Object.values(PaymentMethods),
      required: true,
    },
    special_request: {
      type: String,
      maxlength: 150,
      default: null,
    },
    pickup_otp_hash: {
      type: String,
      required: true,
    },
    rescue_ride: {
      type: Boolean,
      default: false,
    },
    route_breadcrumbs: {
      type: [RouteBreadcrumbSchema],
      default: [],
    },
    cancellation_metadata: {
      type: CancellationMetadataSchema,
      default: undefined,
    },
    sos_events: {
      type: [SosEventSchema],
      default: [],
    },
    insurance_policy_id: {
      type: String,
      default: null,
    },
    passenger_rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    passenger_review_tags: {
      type: [String],
      default: [],
    },
    driver_rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    driver_review_tags: {
      type: [String],
      default: [],
    },
    started_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'trips',
  }
);

// Indexes
TripSchema.index({ trip_code: 1 }, { unique: true, name: 'uniq_trip_code' });
TripSchema.index({ pickup_geo: '2dsphere' }, { name: 'geo_pickup_location' });
TripSchema.index({ dropoff_geo: '2dsphere' }, { name: 'geo_dropoff_location' });
TripSchema.index({ passenger_id: 1, status: 1 }, { name: 'idx_passenger_active_trip' });
TripSchema.index({ driver_id: 1, status: 1 }, { name: 'idx_driver_active_trip' });
TripSchema.index({ status: 1, created_at: -1 }, { name: 'idx_status_created_desc' });
TripSchema.index({ insurance_policy_id: 1 }, { sparse: true, name: 'idx_insurance_policy' });

export const Trip: Model<ITrip> = mongoose.model<ITrip>('Trip', TripSchema);
