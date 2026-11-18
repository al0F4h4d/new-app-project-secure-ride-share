import { Request, Response, NextFunction } from 'express';
import { passengerService } from './passenger.service';
import { sendSuccess } from '../../common/utils/response.util';
import { BadRequestError } from '../../common/errors/appError';
import { ErrorCodes } from '../../common/constants/errorCodes.constant';

const REFRESH_COOKIE_NAME = '__Secure-SR-RefreshToken';

export class PassengerController {
  /**
   * GET /passengers/me
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await passengerService.getProfile(userId);
      sendSuccess(res, profile, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /passengers/me
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const updated = await passengerService.updateProfile(userId, req.body);
      sendSuccess(res, updated, 200, 'Profile updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /passengers/emergency-contacts
   */
  async updateEmergencyContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { emergency_contacts } = req.body;
      const result = await passengerService.updateEmergencyContacts(userId, emergency_contacts);
      sendSuccess(
        res,
        result,
        200,
        `Emergency contacts successfully updated (${result.emergency_contacts.length}/3 configured).`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /passengers/saved-addresses
   */
  async saveAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await passengerService.saveAddress(userId, req.body);
      sendSuccess(res, result, 201, 'Address saved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /passengers/saved-addresses
   */
  async getSavedAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const addresses = await passengerService.getSavedAddresses(userId);
      sendSuccess(res, addresses, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /passengers/saved-addresses/:label (also supports query or body label)
   */
  async deleteSavedAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const label = (req.params.label || req.query.label || req.body.label) as string;

      if (!label) {
        throw new BadRequestError(
          ErrorCodes.VALIDATION_FAILED,
          'Address label parameter is required.',
          'ঠিকানার লেবেল দেওয়া আবশ্যক।'
        );
      }

      const result = await passengerService.deleteSavedAddress(userId, label);
      sendSuccess(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /passengers/account-deletion
   */
  async initiateAccountDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await passengerService.initiateAccountDeletion(userId, req.body);

      // Clear refresh token cookie upon initiating deletion
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      sendSuccess(
        res,
        result,
        200,
        'Account deletion initiated. Your account is scheduled for permanent purge in 30 days. You may log in anytime before this date to cancel.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /passengers/account-deletion
   */
  async revokeAccountDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await passengerService.revokeAccountDeletion(userId);
      sendSuccess(
        res,
        result,
        200,
        'Account deletion canceled. Your profile has been restored to active status.'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const passengerController = new PassengerController();

