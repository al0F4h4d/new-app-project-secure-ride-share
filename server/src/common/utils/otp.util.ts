import crypto from 'crypto';
import { redisClient, isRedisConnected } from '../../config/redis.config';
import { AppError, BadRequestError } from '../errors/appError';
import { ErrorCodes } from '../constants/errorCodes.constant';
import { logger } from '../../config/logger.config';

// In-memory fallback stores for when Redis is disconnected in tests/dev
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const memoryStore = new Map<string, CacheEntry<unknown>>();

const getMemory = <T>(key: string): T | null => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
};

const setMemory = <T>(key: string, value: T, ttlSeconds: number): void => {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const delMemory = (key: string): void => {
  memoryStore.delete(key);
};

const incrMemory = (key: string, ttlSeconds: number): number => {
  const current = getMemory<number>(key) || 0;
  const next = current + 1;
  setMemory(key, next, ttlSeconds);
  return next;
};

export const normalizePhoneNumber = (phone: string): string => {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+880')) {
    return trimmed;
  }
  if (trimmed.startsWith('880')) {
    return `+${trimmed}`;
  }
  if (trimmed.startsWith('01')) {
    return `+88${trimmed}`;
  }
  return trimmed;
};

export const generateSecureOTP = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Checks rate limit for sending OTP (Max 3 requests / 10 minutes per phone).
 * Throws 429 AUTH_OTP_RATE_LIMIT if exceeded.
 */
export const checkOtpRateLimit = async (phone: string): Promise<void> => {
  const normalized = normalizePhoneNumber(phone);
  const rateLimitKey = `rl:otp:${normalized}`;
  const lockoutKey = `lockout:otp:${normalized}`;

  // 1. Check if phone is locked out due to failed verification attempts
  if (isRedisConnected()) {
    const isLocked = await redisClient.get(lockoutKey);
    if (isLocked) {
      const ttl = await redisClient.ttl(lockoutKey);
      throw new AppError(
        ErrorCodes.AUTH_OTP_RATE_LIMIT,
        `Too many failed attempts. Phone is locked for ${Math.ceil(ttl / 60)} more minutes.`,
        429,
        {
          message_bn: 'অতিরিক্ত ভুল চেষ্টার কারণে ফোন নম্বরটি সাময়িকভাবে লক করা হয়েছে।',
          cooldownSeconds: ttl,
        }
      );
    }

    const currentCount = await redisClient.incr(rateLimitKey);
    if (currentCount === 1) {
      await redisClient.expire(rateLimitKey, 600); // 10 minutes
    }

    if (currentCount > 3) {
      const ttl = await redisClient.ttl(rateLimitKey);
      throw new AppError(
        ErrorCodes.AUTH_OTP_RATE_LIMIT,
        'OTP request limit reached. Maximum 3 requests per 10 minutes.',
        429,
        {
          message_bn: 'আপনি খুব বেশিবার চেষ্টা করেছেন। কিছুক্ষণ অপেক্ষা করুন।',
          cooldownSeconds: ttl > 0 ? ttl : 600,
        }
      );
    }
  } else {
    // Fallback to memory
    const isLocked = getMemory<boolean>(lockoutKey);
    if (isLocked) {
      throw new AppError(
        ErrorCodes.AUTH_OTP_RATE_LIMIT,
        'Too many failed attempts. Phone is locked.',
        429,
        {
          message_bn: 'অতিরিক্ত ভুল চেষ্টার কারণে ফোন নম্বরটি সাময়িকভাবে লক করা হয়েছে।',
          cooldownSeconds: 900,
        }
      );
    }

    const currentCount = incrMemory(rateLimitKey, 600);
    if (currentCount > 3) {
      throw new AppError(
        ErrorCodes.AUTH_OTP_RATE_LIMIT,
        'OTP request limit reached. Maximum 3 requests per 10 minutes.',
        429,
        {
          message_bn: 'আপনি খুব বেশিবার চেষ্টা করেছেন। কিছুক্ষণ অপেক্ষা করুন।',
          cooldownSeconds: 600,
        }
      );
    }
  }
};

/**
 * Stores 6-digit OTP in Redis with 120 seconds TTL.
 */
export const storeOTP = async (phone: string, otp: string, ttlSeconds = 120): Promise<void> => {
  const normalized = normalizePhoneNumber(phone);
  const key = `otp:${normalized}`;

  if (isRedisConnected()) {
    await redisClient.set(key, otp, 'EX', ttlSeconds);
  } else {
    setMemory(key, otp, ttlSeconds);
  }
  logger.info(`OTP stored for ${normalized} (expires in ${ttlSeconds}s)`);
};

/**
 * Verifies OTP with failed attempt tracking (max 5 failed attempts -> 15 min lockout).
 */
export const verifyOTP = async (phone: string, inputOtp: string): Promise<boolean> => {
  const normalized = normalizePhoneNumber(phone);
  const otpKey = `otp:${normalized}`;
  const attemptsKey = `otp_attempts:${normalized}`;
  const lockoutKey = `lockout:otp:${normalized}`;

  if (isRedisConnected()) {
    // Check lockout
    const isLocked = await redisClient.get(lockoutKey);
    if (isLocked) {
      const ttl = await redisClient.ttl(lockoutKey);
      throw new AppError(
        ErrorCodes.AUTH_OTP_RATE_LIMIT,
        `Too many failed attempts. Phone is locked for ${Math.ceil(ttl / 60)} more minutes.`,
        429,
        {
          message_bn: 'অতিরিক্ত ভুল চেষ্টার কারণে ফোন নম্বরটি সাময়িকভাবে লক করা হয়েছে।',
          cooldownSeconds: ttl,
        }
      );
    }

    const storedOtp = await redisClient.get(otpKey);
    if (!storedOtp) {
      throw new AppError(ErrorCodes.AUTH_OTP_EXPIRED, 'OTP has expired or does not exist.', 410, {
        message_bn: 'ওটিপির মেয়াদ শেষ হয়ে গেছে।',
      });
    }

    if (storedOtp !== inputOtp) {
      const attempts = await redisClient.incr(attemptsKey);
      if (attempts === 1) {
        await redisClient.expire(attemptsKey, 900); // 15 mins
      }

      if (attempts >= 5) {
        await redisClient.set(lockoutKey, 'locked', 'EX', 900); // 15 min lockout
        await redisClient.del(otpKey);
        await redisClient.del(attemptsKey);
        throw new AppError(
          ErrorCodes.AUTH_OTP_RATE_LIMIT,
          'Too many failed attempts. Account locked for 15 minutes.',
          429,
          {
            message_bn: 'অতিরিক্ত ভুল চেষ্টার কারণে অ্যাকাউন্ট ১৫ মিনিটের জন্য লক করা হয়েছে।',
            cooldownSeconds: 900,
          }
        );
      }

      throw new BadRequestError(
        ErrorCodes.AUTH_INVALID_OTP,
        `Invalid OTP code. ${5 - attempts} attempts remaining.`,
        'ওটিপি কোডটি সঠিক নয়।'
      );
    }

    // Success: Clear OTP and attempts
    await redisClient.del(otpKey);
    await redisClient.del(attemptsKey);
    return true;
  } else {
    // Memory fallback
    const isLocked = getMemory<boolean>(lockoutKey);
    if (isLocked) {
      throw new AppError(
        ErrorCodes.AUTH_OTP_RATE_LIMIT,
        'Too many failed attempts. Phone is locked.',
        429,
        {
          message_bn: 'অতিরিক্ত ভুল চেষ্টার কারণে ফোন নম্বরটি সাময়িকভাবে লক করা হয়েছে।',
          cooldownSeconds: 900,
        }
      );
    }

    const storedOtp = getMemory<string>(otpKey);
    if (!storedOtp) {
      throw new AppError(ErrorCodes.AUTH_OTP_EXPIRED, 'OTP has expired or does not exist.', 410, {
        message_bn: 'ওটিপির মেয়াদ শেষ হয়ে গেছে।',
      });
    }

    if (storedOtp !== inputOtp) {
      const attempts = incrMemory(attemptsKey, 900);
      if (attempts >= 5) {
        setMemory(lockoutKey, true, 900);
        delMemory(otpKey);
        delMemory(attemptsKey);
        throw new AppError(
          ErrorCodes.AUTH_OTP_RATE_LIMIT,
          'Too many failed attempts. Account locked for 15 minutes.',
          429,
          {
            message_bn: 'অতিরিক্ত ভুল চেষ্টার কারণে অ্যাকাউন্ট ১৫ মিনিটের জন্য লক করা হয়েছে।',
            cooldownSeconds: 900,
          }
        );
      }
      throw new BadRequestError(
        ErrorCodes.AUTH_INVALID_OTP,
        `Invalid OTP code. ${5 - attempts} attempts remaining.`,
        'ওটিপি কোডটি সঠিক নয়।'
      );
    }

    delMemory(otpKey);
    delMemory(attemptsKey);
    return true;
  }
};

/**
 * Generates and stores registration ticket (10m TTL).
 */
export const storeRegistrationTicket = async (phone: string): Promise<string> => {
  const normalized = normalizePhoneNumber(phone);
  const ticket = `reg_ticket_${crypto.randomBytes(16).toString('hex')}`;
  const key = `reg_ticket:${ticket}`;
  const ttlSeconds = 600; // 10 minutes

  if (isRedisConnected()) {
    await redisClient.set(key, JSON.stringify({ phone_number: normalized }), 'EX', ttlSeconds);
  } else {
    setMemory(key, JSON.stringify({ phone_number: normalized }), ttlSeconds);
  }

  return ticket;
};

/**
 * Validates and consumes registration ticket. Returns phone number or null.
 */
export const consumeRegistrationTicket = async (ticket: string): Promise<{ phone_number: string } | null> => {
  const key = `reg_ticket:${ticket}`;

  let dataStr: string | null = null;
  if (isRedisConnected()) {
    dataStr = await redisClient.get(key);
    if (dataStr) {
      await redisClient.del(key);
    }
  } else {
    dataStr = getMemory<string>(key);
    if (dataStr) {
      delMemory(key);
    }
  }

  if (!dataStr) {
    return null;
  }

  try {
    return JSON.parse(dataStr) as { phone_number: string };
  } catch {
    return null;
  }
};

