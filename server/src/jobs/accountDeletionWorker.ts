import { Queue, Worker, Job } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refreshToken.model';
import { DeletionStatuses } from '../common/constants/roles.constant';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';

export const ACCOUNT_DELETION_QUEUE_NAME = 'account-deletion-queue';
export const ACCOUNT_DELETION_JOB_NAME = 'daily-account-pii-purge';

export interface PiiScrubResult {
  userId: string;
  scrubbedAt: Date;
  status: 'deleted';
}

/**
 * Core PII scrubbing business logic.
 * Finds all accounts where `deletion_status === 'pending_deletion'` and `scheduled_deletion_at <= now`.
 * Permanently purges PII (name, email, phone, photos, contacts, addresses, fcm tokens)
 * while preserving financial and trip records for statutory audit compliance (7 years).
 */
export const processAccountDeletions = async (
  referenceDate: Date = new Date()
): Promise<PiiScrubResult[]> => {
  logger.info(`[AccountDeletionWorker] Starting PII scrubbing sweep for accounts scheduled <= ${referenceDate.toISOString()}`);

  const expiredAccounts = await User.find({
    deletion_status: DeletionStatuses.PENDING_DELETION,
    scheduled_deletion_at: { $lte: referenceDate },
  });

  const scrubbedResults: PiiScrubResult[] = [];

  for (const account of expiredAccounts) {
    const userId = account._id.toString();

    // 1. Scrub Personally Identifiable Information (PII)
    account.full_name = null;
    account.email = null;
    account.phone_number = null;
    account.profile_photo_url = null;
    account.emergency_contacts = [];
    account.saved_addresses = [];
    account.fcm_tokens = [];

    // 2. Transition account status to permanent deleted state
    account.deletion_status = DeletionStatuses.DELETED;

    // Financial ledger (wallet_transactions, payments, trips) are strictly PRESERVED
    await account.save();

    // 3. Revoke all refresh tokens
    await RefreshToken.updateMany(
      { user_id: account._id },
      { $set: { is_revoked: true } }
    );

    scrubbedResults.push({
      userId,
      scrubbedAt: new Date(),
      status: 'deleted',
    });

    logger.info(`[AccountDeletionWorker] Successfully scrubbed PII for user: ${userId}`);
  }

  logger.info(`[AccountDeletionWorker] PII scrubbing complete. Scrubbed ${scrubbedResults.length} accounts.`);
  return scrubbedResults;
};

/**
 * Build Redis connection options specifically formatted for BullMQ (maxRetriesPerRequest: null).
 */
export const getBullMQRedisOptions = (): RedisOptions => {
  const cleanHost = env.REDIS_HOST.replace(/^(?:https?|tls|rediss?):\/\//, '').replace(/\/$/, '');
  const isTlsRequired =
    env.REDIS_TLS ||
    cleanHost.includes('upstash.io') ||
    env.REDIS_HOST.startsWith('tls://') ||
    env.REDIS_HOST.startsWith('rediss://');

  return {
    host: cleanHost,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    tls: isTlsRequired ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    lazyConnect: true,
  };
};

let deletionQueue: Queue | null = null;
let deletionWorker: Worker | null = null;
let queueRedisConnection: Redis | null = null;
let workerRedisConnection: Redis | null = null;

/**
 * Initialize BullMQ daily cron worker scheduled at 02:00 AM every day.
 */
export const initAccountDeletionWorker = async (): Promise<{
  queue: Queue;
  worker: Worker;
}> => {
  if (deletionQueue && deletionWorker) {
    return { queue: deletionQueue, worker: deletionWorker };
  }

  const redisOptions = getBullMQRedisOptions();
  queueRedisConnection = new Redis(redisOptions);
  workerRedisConnection = new Redis(redisOptions);

  deletionQueue = new Queue(ACCOUNT_DELETION_QUEUE_NAME, {
    connection: queueRedisConnection,
  });

  // Schedule daily repeatable job at 02:00 AM (0 2 * * *)
  await deletionQueue.add(
    ACCOUNT_DELETION_JOB_NAME,
    {},
    {
      repeat: {
        pattern: '0 2 * * *',
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    }
  );

  deletionWorker = new Worker(
    ACCOUNT_DELETION_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`[AccountDeletionWorker] Executing job ${job.id} (${job.name})`);
      return await processAccountDeletions();
    },
    {
      connection: workerRedisConnection,
      concurrency: 1,
    }
  );

  deletionWorker.on('completed', (job: Job) => {
    logger.info(`[AccountDeletionWorker] Job ${job.id} finished successfully.`);
  });

  deletionWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[AccountDeletionWorker] Job ${job?.id} failed:`, { error: err.message });
  });

  return { queue: deletionQueue, worker: deletionWorker };
};

/**
 * Gracefully close worker and queue connections.
 */
export const closeAccountDeletionWorker = async (): Promise<void> => {
  try {
    if (deletionWorker) {
      await deletionWorker.close();
      deletionWorker = null;
    }
    if (deletionQueue) {
      await deletionQueue.close();
      deletionQueue = null;
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
    logger.error('[AccountDeletionWorker] Error closing worker connections:', { error });
  }
};

