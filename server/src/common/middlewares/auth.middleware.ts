import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { UnauthorizedError } from '../errors/appError';
import { ErrorCodes } from '../constants/errorCodes.constant';
import { AuthenticatedUser } from '../../types/express';

/**
 * Middleware: Verifies Bearer JWT access token from Authorization header and attaches req.user.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError(
      ErrorCodes.AUTH_INVALID_CREDENTIALS,
      'Authentication required. Please provide a valid Bearer token.',
      'অনুরোধটির জন্য প্রমাণীকরণ টোকেন আবশ্যক।'
    );
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError(
      ErrorCodes.AUTH_INVALID_CREDENTIALS,
      'Malformed Authorization header.',
      'প্রমাণীকরণ টোকেনটির ফরম্যাট সঠিক নয়।'
    );
  }

  const decoded = verifyAccessToken(token);

  req.user = {
    userId: decoded.userId,
    role: decoded.role,
    admin_sub_role: decoded.admin_sub_role,
    deviceId: decoded.deviceId,
  } as AuthenticatedUser;

  next();
};

/**
 * Optional authentication: Attaches req.user if a valid token is provided, but does not block if omitted.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          role: decoded.role,
          admin_sub_role: decoded.admin_sub_role,
          deviceId: decoded.deviceId,
        } as AuthenticatedUser;
      } catch {
        // Silently skip if invalid in optional auth
      }
    }
  }

  next();
};

