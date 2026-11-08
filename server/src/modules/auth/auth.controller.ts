import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../common/utils/response.util';
import { env } from '../../config/env.config';

const REFRESH_COOKIE_NAME = '__Secure-SR-RefreshToken';

const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
};

const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

export class AuthController {
  /**
   * POST /auth/send-otp
   */
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.sendOtp(req.body);
      sendSuccess(res, result, 200, 'OTP has been successfully dispatched via SMS.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-otp
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, refreshToken } = await authService.verifyOtp(
        req.body,
        req.body?.device_fingerprint
      );

      if (refreshToken) {
        setRefreshTokenCookie(res, refreshToken);
      }

      const message = data.is_new_user
        ? 'OTP verified. Proceed to account registration.'
        : 'OTP verified successfully. Login authorized.';

      sendSuccess(res, data, 200, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, refreshToken } = await authService.register(
        req.body,
        req.body?.device_fingerprint
      );

      setRefreshTokenCookie(res, refreshToken);
      sendSuccess(res, data, 201, 'User registered successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, refreshToken } = await authService.login(req.body);

      setRefreshTokenCookie(res, refreshToken);
      sendSuccess(res, data, 200, 'Login successful.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh-token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refresh_token;

      const { data, newRefreshToken } = await authService.refreshToken(
        rawToken,
        req.body?.device_fingerprint
      );

      setRefreshTokenCookie(res, newRefreshToken);
      sendSuccess(res, data, 200, 'Token refreshed successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refresh_token;

      await authService.logout(rawToken, req.user?.userId);
      clearRefreshTokenCookie(res);

      sendSuccess(res, null, 200, 'Successfully logged out. Refresh session revoked.');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

