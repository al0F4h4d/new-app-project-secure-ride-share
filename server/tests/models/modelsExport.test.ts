import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import {
  User,
  DriverProfile,
  Vehicle,
  Trip,
  Payment,
  WalletTransaction,
  PassengerWalletTransaction,
  TelemetryLog,
  DeviceBlacklist,
  NidBlacklist,
  SosAuditLog,
  ChatMessage,
  LoyaltyPoints,
  LoyaltyTransaction,
  CommissionPass,
} from '../../src/models';

describe('All 15 Mongoose Models Export & Metadata Test', () => {
  const modelList = [
    { name: 'User', model: User, collection: 'users' },
    { name: 'DriverProfile', model: DriverProfile, collection: 'driver_profiles' },
    { name: 'Vehicle', model: Vehicle, collection: 'vehicles' },
    { name: 'Trip', model: Trip, collection: 'trips' },
    { name: 'Payment', model: Payment, collection: 'payments' },
    { name: 'WalletTransaction', model: WalletTransaction, collection: 'wallet_transactions' },
    {
      name: 'PassengerWalletTransaction',
      model: PassengerWalletTransaction,
      collection: 'passenger_wallet_transactions',
    },
    { name: 'TelemetryLog', model: TelemetryLog, collection: 'telemetry_logs' },
    { name: 'DeviceBlacklist', model: DeviceBlacklist, collection: 'device_blacklists' },
    { name: 'NidBlacklist', model: NidBlacklist, collection: 'nid_blacklist' },
    { name: 'SosAuditLog', model: SosAuditLog, collection: 'sos_audit_logs' },
    { name: 'ChatMessage', model: ChatMessage, collection: 'chat_messages' },
    { name: 'LoyaltyPoints', model: LoyaltyPoints, collection: 'loyalty_points' },
    { name: 'LoyaltyTransaction', model: LoyaltyTransaction, collection: 'loyalty_transactions' },
    { name: 'CommissionPass', model: CommissionPass, collection: 'commission_passes' },
  ];

  it('should verify all 15 models are defined and have schemas', () => {
    expect(modelList).toHaveLength(15);

    for (const item of modelList) {
      expect(item.model).toBeDefined();
      expect(item.model.schema).toBeDefined();
      expect(item.model.collection.name).toBe(item.collection);
      expect(mongoose.models[item.name]).toBeDefined();
    }
  });
});

