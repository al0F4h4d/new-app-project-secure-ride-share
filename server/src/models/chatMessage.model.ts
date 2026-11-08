import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage extends Document {
  trip_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  sender_role: 'passenger' | 'driver';
  message_text: string;
  sent_at: Date;
  expires_at: Date;
}

export const ChatMessageSchema = new Schema<IChatMessage>(
  {
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender_role: {
      type: String,
      enum: ['passenger', 'driver'],
      required: true,
    },
    message_text: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 500,
      trim: true,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days TTL
    },
  },
  {
    collection: 'chat_messages',
  }
);

// Indexes
ChatMessageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, name: 'ttl_chat_7d' });
ChatMessageSchema.index({ trip_id: 1, sent_at: 1 }, { name: 'idx_trip_chat_chronological' });

export const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>(
  'ChatMessage',
  ChatMessageSchema
);
