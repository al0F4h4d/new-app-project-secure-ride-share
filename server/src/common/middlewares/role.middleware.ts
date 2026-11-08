import { Request, Response, NextFunction } from 'express';
import { UserRole, AdminSubRole, UserRoles, AdminSubRoles } from '../constants/roles.constant';
import { ForbiddenError, UnauthorizedError } from '../errors/appError';
import { ErrorCodes } from '../constants/errorCodes.constant';

export type RoleGateTarget =
  | UserRole
  | 'admin_ops'
  | 'admin_safety'
  | 'admin_super';

/**
 * Higher-order RBAC middleware. Enforces role boundaries supporting Passenger, Driver, and Admin sub-roles.
 */
export const requireRole = (
  allowedRoles: RoleGateTarget[],
  allowedSubRoles?: AdminSubRole[]
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Authentication required.',
        'অনুরোধটির জন্য প্রমাণীকরণ প্রয়োজন।'
      );
    }

    const { role, admin_sub_role } = req.user;

    // Check direct role match
    if ((allowedRoles as string[]).includes(role)) {
      // If user is admin and specific sub-roles are required
      if (role === UserRoles.ADMIN && allowedSubRoles && allowedSubRoles.length > 0) {
        // Super admin bypasses all sub-role gates
        if (admin_sub_role === AdminSubRoles.SUPER) {
          return next();
        }

        if (!admin_sub_role || !allowedSubRoles.includes(admin_sub_role)) {
          throw new ForbiddenError(
            ErrorCodes.AUTH_FORBIDDEN_ROLE,
            `Access forbidden. Requires admin sub-role: ${allowedSubRoles.join(', ')}.`,
            'আপনার এই অ্যাডমিন অ্যাকশনটি সম্পন্ন করার প্রয়োজনীয় পারমিশন নেই।'
          );
        }
      }

      return next();
    }

    // Check compound admin roles (admin_ops, admin_safety, admin_super)
    if (role === UserRoles.ADMIN) {
      // Super admin has universal access
      if (admin_sub_role === AdminSubRoles.SUPER) {
        return next();
      }

      if (admin_sub_role === AdminSubRoles.OPS && allowedRoles.includes('admin_ops')) {
        return next();
      }

      if (admin_sub_role === AdminSubRoles.SAFETY && allowedRoles.includes('admin_safety')) {
        return next();
      }
    }

    throw new ForbiddenError(
      ErrorCodes.AUTH_FORBIDDEN_ROLE,
      `Access forbidden for role '${role}'.`,
      'আপনার এই অ্যাকশনটি সম্পন্ন করার অনুমতি নেই।'
    );
  };
};
