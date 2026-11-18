import { Router } from 'express';
import multer from 'multer';
import { driverController } from './driver.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { requireRole } from '../../common/middlewares/role.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { UserRoles } from '../../common/constants/roles.constant';
import {
  kycStep1Schema,
  kycStep2Schema,
  registerVehicleSchema,
  toggleOnlineSchema,
  purchaseCommissionPassSchema,
} from './driver.validation';

export const driverRoutes = Router();

// Configure in-memory upload handler (Max 5MB per document as per spec)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Enforce Driver authentication across all driver routes
driverRoutes.use(authenticate, requireRole([UserRoles.DRIVER]));

// 4.1 KYC Step 1: Submit Identity & License Documents
driverRoutes.post(
  '/kyc/step1-identity',
  upload.fields([
    { name: 'nid_document_front', maxCount: 1 },
    { name: 'nid_document_back', maxCount: 1 },
    { name: 'license_document', maxCount: 1 },
  ]),
  validate(kycStep1Schema),
  (req, res, next) => driverController.submitStep1Identity(req, res, next)
);

// 4.2 KYC Step 2: Submit Biometric Live Selfie
driverRoutes.post(
  '/kyc/step2-biometrics',
  upload.single('live_selfie'),
  validate(kycStep2Schema),
  (req, res, next) => driverController.submitStep2Biometrics(req, res, next)
);

// 4.3 Register Fleet Vehicle
driverRoutes.post(
  '/vehicles',
  upload.fields([
    { name: 'front_photo', maxCount: 1 },
    { name: 'rear_photo', maxCount: 1 },
    { name: 'registration_document', maxCount: 1 },
  ]),
  validate(registerVehicleSchema),
  (req, res, next) => driverController.registerVehicle(req, res, next)
);

// 4.4 Set Active Operational Vehicle
driverRoutes.patch('/vehicles/:id/activate', (req, res, next) =>
  driverController.activateVehicle(req, res, next)
);
driverRoutes.patch('/vehicles/:vehicleId/activate', (req, res, next) =>
  driverController.activateVehicle(req, res, next)
);

// 4.5 Toggle Online / Offline Dispatch Availability
driverRoutes.patch(
  '/status/online',
  validate(toggleOnlineSchema),
  (req, res, next) => driverController.toggleOnlineStatus(req, res, next)
);

// 4.6 Purchase Pro-Captain Zero-Commission Subscription Pass
driverRoutes.post(
  '/commission-pass/purchase',
  validate(purchaseCommissionPassSchema),
  (req, res, next) => driverController.purchaseCommissionPass(req, res, next)
);
