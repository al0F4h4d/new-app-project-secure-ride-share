import { Request, Response, NextFunction } from 'express';
import { driverService } from './driver.service';
import { sendSuccess } from '../../common/utils/response.util';
import { BadRequestError } from '../../common/errors/appError';
import { ErrorCodes } from '../../common/constants/errorCodes.constant';

export class DriverController {
  /**
   * POST /drivers/kyc/step1-identity
   */
  async submitStep1Identity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      const nidFront = files?.['nid_document_front']?.[0];
      const nidBack = files?.['nid_document_back']?.[0];
      const licenseDoc = files?.['license_document']?.[0];

      const result = await driverService.submitStep1Identity(userId, req.body, {
        nid_document_front: nidFront,
        nid_document_back: nidBack,
        license_document: licenseDoc,
      });

      sendSuccess(
        res,
        result,
        200,
        'Step 1 identity documents uploaded successfully. OCR parsing complete.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /drivers/kyc/step2-biometrics
   */
  async submitStep2Biometrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const file =
        req.file ||
        (req.files as { [fieldname: string]: Express.Multer.File[] })?.['live_selfie']?.[0];

      const deviceFingerprint = {
        imei_hash: (req.headers['x-device-fingerprint'] as string) || req.body.imei_hash,
        android_id: req.body.android_id,
      };

      const result = await driverService.submitStep2Biometrics(
        userId,
        req.body,
        file,
        deviceFingerprint
      );

      sendSuccess(
        res,
        result,
        200,
        'Biometrics verified and queued for admin operations approval.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /drivers/vehicles
   */
  async registerVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      const frontPhoto = files?.['front_photo']?.[0];
      const rearPhoto = files?.['rear_photo']?.[0];
      const regDoc = files?.['registration_document']?.[0];

      const result = await driverService.registerVehicle(userId, req.body, {
        front_photo: frontPhoto,
        rear_photo: rearPhoto,
        registration_document: regDoc,
      });

      sendSuccess(res, result, 201, 'Vehicle submitted for regulatory verification.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /drivers/vehicles/:id/activate
   */
  async activateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const vehicleId = req.params.vehicleId || req.params.id;

      if (!vehicleId) {
        throw new BadRequestError(
          ErrorCodes.VALIDATION_FAILED,
          'Vehicle ID parameter is required.',
          'গাড়ির আইডি আবশ্যক।'
        );
      }

      const result = await driverService.activateVehicle(userId, vehicleId);

      sendSuccess(
        res,
        result,
        200,
        'Vehicle activated successfully. You can now accept rides in this vehicle class.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /drivers/status/online
   */
  async toggleOnlineStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await driverService.toggleOnlineStatus(userId, req.body);

      const message = result.is_online
        ? 'Driver is now ONLINE and discoverable for dispatch.'
        : 'Driver is now OFFLINE.';

      sendSuccess(res, result, 200, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /drivers/commission-pass/purchase
   */
  async purchaseCommissionPass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await driverService.purchaseCommissionPass(userId, req.body);

      sendSuccess(
        res,
        result,
        200,
        `Pro-Captain ${result.pass_type === 'daily' ? 'Daily' : 'Weekly'} Pass activated successfully. 0% platform commission applied.`
      );
    } catch (error) {
      next(error);
    }
  }
}

export const driverController = new DriverController();
