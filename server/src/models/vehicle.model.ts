import mongoose, { Schema, Document, Model } from 'mongoose';
import { VehicleClasses, VehicleClass } from '../common/constants/roles.constant';

export interface IVehicle extends Document {
  driver_id: mongoose.Types.ObjectId;
  brta_plate_number: string;
  tax_token_number: string;
  tax_token_expiry: Date;
  vehicle_class: VehicleClass;
  brand: string;
  model_name: string;
  color: string;
  front_photo_url: string;
  rear_photo_url: string;
  registration_document_url: string;
  is_approved: boolean;
  created_at: Date;
  updated_at: Date;
}

export const VehicleSchema = new Schema<IVehicle>(
  {
    driver_id: {
      type: Schema.Types.ObjectId,
      ref: 'DriverProfile',
      required: true,
    },
    brta_plate_number: {
      type: String,
      required: true,
      trim: true,
    },
    tax_token_number: {
      type: String,
      required: true,
      trim: true,
    },
    tax_token_expiry: {
      type: Date,
      required: true,
    },
    vehicle_class: {
      type: String,
      enum: Object.values(VehicleClasses),
      required: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model_name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    front_photo_url: {
      type: String,
      required: true,
    },
    rear_photo_url: {
      type: String,
      required: true,
    },
    registration_document_url: {
      type: String,
      required: true,
    },
    is_approved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'vehicles',
  }
);

// Indexes
VehicleSchema.index({ brta_plate_number: 1 }, { unique: true, name: 'uniq_brta_plate' });
VehicleSchema.index({ driver_id: 1 }, { name: 'idx_vehicle_driver_id' });
VehicleSchema.index({ is_approved: 1, vehicle_class: 1 }, { name: 'idx_approved_vehicle_class' });
VehicleSchema.index({ tax_token_expiry: 1 }, { name: 'idx_tax_token_expiry' });

export const Vehicle: Model<IVehicle> = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
