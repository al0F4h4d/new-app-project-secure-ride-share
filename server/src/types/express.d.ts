import { UserRole, AdminSubRole } from '../common/constants/roles.constant';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  admin_sub_role?: AdminSubRole | null;
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

