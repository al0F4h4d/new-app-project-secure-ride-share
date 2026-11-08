import { connectDatabase, disconnectDatabase } from '../config/database.config';
import { logger } from '../config/logger.config';
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
  RefreshToken,
} from '../models';

const models = [
  { name: 'User', model: User },
  { name: 'DriverProfile', model: DriverProfile },
  { name: 'Vehicle', model: Vehicle },
  { name: 'Trip', model: Trip },
  { name: 'Payment', model: Payment },
  { name: 'WalletTransaction', model: WalletTransaction },
  { name: 'PassengerWalletTransaction', model: PassengerWalletTransaction },
  { name: 'TelemetryLog', model: TelemetryLog },
  { name: 'DeviceBlacklist', model: DeviceBlacklist },
  { name: 'NidBlacklist', model: NidBlacklist },
  { name: 'SosAuditLog', model: SosAuditLog },
  { name: 'ChatMessage', model: ChatMessage },
  { name: 'LoyaltyPoints', model: LoyaltyPoints },
  { name: 'LoyaltyTransaction', model: LoyaltyTransaction },
  { name: 'CommissionPass', model: CommissionPass },
  { name: 'RefreshToken', model: RefreshToken },
];

export const initAllIndexes = async (): Promise<void> => {
  logger.info('========================================================');
  logger.info('🔄 Initiating MongoDB Index Synchronization for SecureRide...');
  logger.info('========================================================');

  for (const item of models) {
    try {
      logger.info(`Building & syncing indexes for collection: [${item.model.collection.name}] (${item.name})...`);
      await item.model.syncIndexes();
      const indexes = await item.model.collection.indexes();
      logger.info(`✅ Indexes synced for [${item.name}]:`, {
        count: indexes.length,
        names: indexes.map((idx) => idx.name),
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`❌ Failed to sync indexes for [${item.name}]:`, { error: errorMessage });
      throw err;
    }
  }

  logger.info('🎉 All 15 collection indexes successfully initialized.');
};

if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      await initAllIndexes();
      await disconnectDatabase();
      process.exit(0);
    } catch (error) {
      logger.error('Fatal error during index initialization:', { error });
      await disconnectDatabase();
      process.exit(1);
    }
  })();
}
