import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.config';
import { UserRole, AdminSubRole } from '../constants/roles.constant';
import { UnauthorizedError } from '../errors/appError';
import { ErrorCodes } from '../constants/errorCodes.constant';

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
  admin_sub_role?: AdminSubRole | null;
  deviceId?: string;
}

export interface DecodedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

/**
 * Sign a short-lived Access Token (default 15m).
 */
export const signAccessToken = (payload: AccessTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

/**
 * Verify and decode an Access Token.
 * Throws UnauthorizedError with standard error codes if invalid or expired.
 */
export const verifyAccessToken = (token: string): DecodedAccessToken => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as DecodedAccessToken;
    return decoded;
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_TOKEN_EXPIRED,
        'Access token expired. Please refresh session.',
        'আপনার সেশনের মেয়াদ শেষ। অনুগ্রহ করে রিফ্রেশ করুন।'
      );
    }
    throw new UnauthorizedError(
      ErrorCodes.AUTH_INVALID_CREDENTIALS,
      'Invalid authentication token.',
      'প্রদত্ত প্রমাণীকরণ টোকেনটি সঠিক নয়।'
    );
  }
};

/**
 * Generate a cryptographically secure, high-entropy Refresh Token string.
 */
export const generateRefreshToken = (): string => {
  return `sr_rf_${crypto.randomBytes(40).toString('hex')}`;
};

/**
 * Deterministically hash a token for secure database storage and fast lookup.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Generate a unique token family ID (UUID v4) for tracking rotation chains.
 */
export const generateFamilyId = (): string => {
  return uuidv4();
};

/**
 * Parse expiration duration into Date (e.g. '30d' -> Date in 30 days).
 */
export const getRefreshTokenExpiryDate = (): Date => {
  // Default 30 days
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
};

