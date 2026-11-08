import crypto from 'crypto';
import argon2 from 'argon2';
import { env } from '../../config/env.config';

const ALGORITHM = 'aes-256-gcm';
const KEY_BUFFER = Buffer.from(env.ENCRYPTION_KEY_HEX, 'hex');

export interface EncryptedData {
  cipherText: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt sensitive PII (NID, Driving License, TOTP Secret) using AES-256-GCM.
 */
export const encryptPII = (plainText: string): EncryptedData => {
  const iv = crypto.randomBytes(12); // Recommended 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    cipherText: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
};

/**
 * Decrypt sensitive PII using AES-256-GCM authenticated cipher.
 */
export const decryptPII = (cipherText: string, iv: string, authTag: string): string => {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Deterministic SHA-256 Hash for database indexed lookups of encrypted fields (e.g. NID search).
 */
export const hashDeterministic = (value: string): string => {
  return crypto.createHmac('sha256', KEY_BUFFER).update(value.trim()).digest('hex');
};

/**
 * Generate secure cryptographically random hex token.
 */
export const generateRandomToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Secure password hashing using Argon2id with memory hardness.
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
};

/**
 * Secure password verification using Argon2id.
 */
export const verifyPassword = async (hash: string, plainPassword: string): Promise<boolean> => {
  return argon2.verify(hash, plainPassword);
};

