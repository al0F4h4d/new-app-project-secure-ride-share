import mongoose, { Schema, Document, Model } from 'mongoose';
import { SosAuditActions, SosAuditAction } from '../common/constants/roles.constant';

export interface ISosAuditLog extends Document {
  trip_id: mongoose.Types.ObjectId;
  admin_id: mongoose.Types.ObjectId;
  action: SosAuditAction;
  audio_recording_url?: string | null;
  ip_address: string;
  user_agent: string;
  accessed_at: Date;
}

export const SosAuditLogSchema = new Schema<ISosAuditLog>(
  {
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    admin_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(SosAuditActions),
      required: true,
    },
    audio_recording_url: {
      type: String,
      default: null,
    },
    ip_address: {
      type: String,
      required: true,
    },
    user_agent: {
      type: String,
      required: true,
    },
    accessed_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'sos_audit_logs',
  }
);

// Indexes
SosAuditLogSchema.index({ trip_id: 1 }, { name: 'idx_sos_audit_trip' });
SosAuditLogSchema.index({ admin_id: 1 }, { name: 'idx_sos_audit_admin' });
SosAuditLogSchema.index({ accessed_at: 1 }, { name: 'idx_sos_audit_accessed' });

export const SosAuditLog: Model<ISosAuditLog> = mongoose.model<ISosAuditLog>(
  'SosAuditLog',
  SosAuditLogSchema
);
