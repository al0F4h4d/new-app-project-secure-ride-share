import mongoose, { Schema, Document, Model } from 'mongoose';
import { IGeoPoint } from './trip.model';

export interface ITelemetryLog extends Document {
  trip_id: mongoose.Types.ObjectId;
  user_role: 'passenger' | 'driver';
  user_id: mongoose.Types.ObjectId;
  location: IGeoPoint;
  speed: number;
  heading: number;
  accelerometer_magnitude: number;
  altitude_m: number;
  barometer_hpa: number;
  is_mock: boolean;
  timestamp: Date;
  expires_at: Date;
}

export const TelemetryLogSchema = new Schema<ITelemetryLog>(
  {
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    user_role: {
      type: String,
      enum: ['passenger', 'driver'],
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
          message: 'Coordinates must be [longitude, latitude]',
        },
      },
    },
    speed: {
      type: Number,
      required: true,
      default: 0.0,
    },
    heading: {
      type: Number,
      required: true,
      min: 0,
      max: 360,
      default: 0.0,
    },
    accelerometer_magnitude: {
      type: Number,
      required: true,
      default: 1.0,
    },
    altitude_m: {
      type: Number,
      required: true,
      default: 0.0,
    },
    barometer_hpa: {
      type: Number,
      required: true,
      default: 1013.25,
    },
    is_mock: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 Hours TTL
    },
  },
  {
    collection: 'telemetry_logs',
  }
);

// Indexes
TelemetryLogSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, name: 'ttl_telemetry_48h' });
TelemetryLogSchema.index({ trip_id: 1, timestamp: 1 }, { name: 'idx_trip_telemetry_series' });
TelemetryLogSchema.index({ location: '2dsphere' }, { name: 'geo_telemetry_location' });

export const TelemetryLog: Model<ITelemetryLog> = mongoose.model<ITelemetryLog>(
  'TelemetryLog',
  TelemetryLogSchema
);
