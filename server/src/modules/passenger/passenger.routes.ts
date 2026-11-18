import { Router } from 'express';
import { passengerController } from './passenger.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { requireRole } from '../../common/middlewares/role.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { UserRoles } from '../../common/constants/roles.constant';
import {
  updatePassengerProfileSchema,
  updateEmergencyContactsSchema,
  saveAddressSchema,
  accountDeletionSchema,
} from './passenger.validation';

export const passengerRoutes = Router();

// Enforce Passenger authentication across all passenger endpoints
passengerRoutes.use(authenticate, requireRole([UserRoles.PASSENGER]));

// Profile Management
passengerRoutes.get('/me', (req, res, next) => passengerController.getProfile(req, res, next));
passengerRoutes.patch(
  '/me',
  validate(updatePassengerProfileSchema),
  (req, res, next) => passengerController.updateProfile(req, res, next)
);

// Emergency Contacts
passengerRoutes.put(
  '/emergency-contacts',
  validate(updateEmergencyContactsSchema),
  (req, res, next) => passengerController.updateEmergencyContacts(req, res, next)
);

// Saved Addresses
passengerRoutes.post(
  '/saved-addresses',
  validate(saveAddressSchema),
  (req, res, next) => passengerController.saveAddress(req, res, next)
);
passengerRoutes.get('/saved-addresses', (req, res, next) => passengerController.getSavedAddresses(req, res, next));
passengerRoutes.delete('/saved-addresses/:label', (req, res, next) => passengerController.deleteSavedAddress(req, res, next));
passengerRoutes.delete('/saved-addresses', (req, res, next) => passengerController.deleteSavedAddress(req, res, next));

// 30-Day Account Deletion Lifecycle
passengerRoutes.post(
  '/account-deletion',
  validate(accountDeletionSchema),
  (req, res, next) => passengerController.initiateAccountDeletion(req, res, next)
);
passengerRoutes.delete('/account-deletion', (req, res, next) => passengerController.revokeAccountDeletion(req, res, next));

