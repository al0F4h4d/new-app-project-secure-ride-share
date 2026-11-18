import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Vehicle } from '../models/vehicle.model';
import { logger } from '../config/logger.config';
import { getBullMQRedisOptions } from './accountDeletionWorker';

export const TAX_TOKEN_EXPIRY_QUEUE_NAME = 'tax-token-expiry-queue';
export const TAX_TOKEN_EXPIRY_JOB_NAME = 'daily-tax-token-expiry-check';

export interface TaxTokenExpiryResult {
  vehicleId: string;
  brtaPlateNumber: string;
  driverId: string;
  taxTokenExpiry: Date;
  isApproved: boolean;
}

/**
 * Core business logic for checking tax token expirations.
 * Finds all vehicles where `tax_token_expiry < Today + 15 days` and `is_approved === true`.
 * Automatically sets `is_approved = false` to suspend dispatch availability and alerts driver.
 */
export const processTaxTokenExpirations = async (
  referenceDate: Date = new Date()
): Promise<TaxTokenExpiryResult[]> => {
  const thresholdDate = new Date(referenceDate);
  thresholdDate.setDate(thresholdDate.getDate() + 15);

  logger.info(
    `[TaxTokenExpiryWorker] Checking vehicles with tax token expiring before ${thresholdDate.toISOString()}`
  );

  const expiringVehicles = await Vehicle.find({
    is_approved: true,
    tax_token_expiry: { $lt: thresholdDate },
  });

  const revokedVehicles: TaxTokenExpiryResult[] = [];

  for (const vehicle of expiringVehicles) {
    vehicle.is_approved = false;
    await vehicle.save();

    logger.warn(
      `[TaxTokenExpiryWorker] Vehicle ${vehicle.brta_plate_number} (ID: ${vehicle._id}) approval revoked due to tax token expiring on ${vehicle.tax_token_expiry.toISOString()}`
    );

    revokedVehicles.push({
      vehicleId: vehicle._id.toString(),
      brtaPlateNumber: vehicle.brta_plate_number,
      driverId: vehicle.driver_id.toString(),
      taxTokenExpiry: vehicle.tax_token_expiry,
      isApproved: false,
    });
  }

  logger.info(
    `[TaxTokenExpiryWorker] Expiry sweep completed. Revoked approval for ${revokedVehicles.length} vehicles.`
  );

  return revokedVehicles;
};

let taxTokenQueue: Queue | null = null;
let taxTokenWorker: Worker | null = null;
let queueRedisConnection: Redis | null = null;
let workerRedisConnection: Redis | null = null;

/**
 * Initialize BullMQ daily tax token expiry cron worker scheduled at 02:00 AM every day.
 */
export const initTaxTokenExpiryWorker = async (): Promise<{
  queue: Queue;
  worker: Worker;
}> => {
  if (taxTokenQueue && taxTokenWorker) {
    return { queue: taxTokenQueue, worker: taxTokenWorker };
  }

  const redisOptions = getBullMQRedisOptions();
  queueRedisConnection = new Redis(redisOptions);
  workerRedisConnection = new Redis(redisOptions);

  taxTokenQueue = new Queue(TAX_TOKEN_EXPIRY_QUEUE_NAME, {
    connection: queueRedisConnection,
  });

  // Schedule daily repeatable job at 02:00 AM (0 2 * * *)
  await taxTokenQueue.add(
    TAX_TOKEN_EXPIRY_JOB_NAME,
    {},
    {
      repeat: {
        pattern: '0 2 * * *',
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    }
  );

  taxTokenWorker = new Worker(
    TAX_TOKEN_EXPIRY_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`[TaxTokenExpiryWorker] Executing job ${job.id} (${job.name})`);
      return await processTaxTokenExpirations();
    },
    {
      connection: workerRedisConnection,
      concurrency: 1,
    }
  );

  taxTokenWorker.on('completed', (job: Job) => {
    logger.info(`[TaxTokenExpiryWorker] Job ${job.id} finished successfully.`);
  });

  taxTokenWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[TaxTokenExpiryWorker] Job ${job?.id} failed:`, { error: err.message });
  });

  return { queue: taxTokenQueue, worker: taxTokenWorker };
};

/**
 * Gracefully close worker and queue connections.
 */
export const closeTaxTokenExpiryWorker = async (): Promise<void> => {
  try {
    if (taxTokenWorker) {
      await taxTokenWorker.close();
      taxTokenWorker = null;
    }
    if (taxTokenQueue) {
      await taxTokenQueue.close();
      taxTokenQueue = null;
    }
    if (queueRedisConnection) {
      await queueRedisConnection.quit();
      queueRedisConnection = null;
    }
    if (workerRedisConnection) {
      await workerRedisConnection.quit();
      workerRedisConnection = null;
    }
  } catch (error) {
    logger.error('[TaxTokenExpiryWorker] Error closing worker connections:', { error });
  }
};
