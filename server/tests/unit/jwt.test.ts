import { describe, it, expect } from '@jest/globals';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  generateFamilyId,
  getRefreshTokenExpiryDate,
} from '../../src/common/utils/jwt.util';
import { UserRoles, AdminSubRoles } from '../../src/common/constants/roles.constant';
import { UnauthorizedError } from '../../src/common/errors/appError';

describe('JWT & Token Utilities Unit Test', () => {
  const samplePayload = {
    userId: '67223a10e4b011e4c8d50101',
    role: UserRoles.PASSENGER,
  };

  it('should sign and successfully verify a valid access token', () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // Standard JWT format

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(samplePayload.userId);
    expect(decoded.role).toBe(samplePayload.role);
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });

  it('should sign and verify access token with admin sub-roles', () => {
    const adminPayload = {
      userId: '67223a10e4b011e4c8d50999',
      role: UserRoles.ADMIN,
      admin_sub_role: AdminSubRoles.SAFETY,
    };

    const token = signAccessToken(adminPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.role).toBe(UserRoles.ADMIN);
    expect(decoded.admin_sub_role).toBe(AdminSubRoles.SAFETY);
  });

  it('should throw UnauthorizedError when verifying an invalid token', () => {
    expect(() => {
      verifyAccessToken('invalid.token.string');
    }).toThrow(UnauthorizedError);
  });

  it('should generate high-entropy refresh token and deterministic hash', () => {
    const refreshToken = generateRefreshToken();
    expect(refreshToken.startsWith('sr_rf_')).toBe(true);

    const hash1 = hashToken(refreshToken);
    const hash2 = hashToken(refreshToken);

    expect(hash1).toHaveLength(64); // SHA-256 hex output
    expect(hash1).toBe(hash2); // Deterministic
  });

  it('should generate UUID v4 family IDs', () => {
    const family1 = generateFamilyId();
    const family2 = generateFamilyId();

    expect(family1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(family1).not.toBe(family2);
  });

  it('should calculate refresh token expiry ~30 days in the future', () => {
    const expiry = getRefreshTokenExpiryDate();
    const now = new Date();
    const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });
});

