import { describe, it, expect } from '@jest/globals';
import {
  encryptPII,
  decryptPII,
  hashDeterministic,
  generateRandomToken,
  hashPassword,
  verifyPassword,
} from '../../src/common/utils/crypto.util';

describe('Crypto Utility Suite', () => {
  const plainTextNID = '19951234567890123';

  it('should encrypt and decrypt sensitive PII correctly using AES-256-GCM', () => {
    const encrypted = encryptPII(plainTextNID);

    expect(encrypted).toHaveProperty('cipherText');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');
    expect(encrypted.cipherText).not.toEqual(plainTextNID);

    const decrypted = decryptPII(encrypted.cipherText, encrypted.iv, encrypted.authTag);
    expect(decrypted).toEqual(plainTextNID);
  });

  it('should fail decryption if ciphertext or authTag is tampered', () => {
    const encrypted = encryptPII(plainTextNID);
    const tamperedTag = '00' + encrypted.authTag.slice(2);

    expect(() => {
      decryptPII(encrypted.cipherText, encrypted.iv, tamperedTag);
    }).toThrow();
  });

  it('should generate consistent deterministic hash for indexed searches', () => {
    const hash1 = hashDeterministic('01712345678');
    const hash2 = hashDeterministic('01712345678');
    const hash3 = hashDeterministic('01812345678');

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(hash3);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it('should generate random hex tokens of correct byte length', () => {
    const token = generateRandomToken(16);
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it('should hash and verify passwords using Argon2id', async () => {
    const password = 'SuperSecretSecurePassword!2026';
    const hash = await hashPassword(password);

    expect(hash).toContain('$argon2id$');
    const isValid = await verifyPassword(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword(hash, 'WrongPassword');
    expect(isInvalid).toBe(false);
  });
});

