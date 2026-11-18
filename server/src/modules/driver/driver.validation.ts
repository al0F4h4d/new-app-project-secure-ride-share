import { z } from 'zod';
import {
  LicenseCategories,
  VehicleClasses,
  CommissionPassTypes,
} from '../../common/constants/roles.constant';

const smartNidRegex = /^\d{10}$|^\d{17}$/;
// Flexible BRTA registration regex: e.g. "Dhaka Metro-HA 45-8912", "Chatto Metro-GA 11-2233", etc.
const brtaPlateRegex = /^[A-Za-z\s]+-[A-Za-z\s]{1,4}\s*\d{2}-\d{4}$/i;

export const kycStep1Schema = z.object({
  body: z.object({
    nid_number: z
      .string({ required_error: 'Smart NID number is required' })
      .trim()
      .regex(smartNidRegex, 'Smart NID must be 10 or 17 digits'),
    license_number: z
      .string({ required_error: 'Driving license number is required' })
      .trim()
      .min(5, 'License number must be at least 5 characters'),
    license_category: z.enum([LicenseCategories.MOTORCYCLE, LicenseCategories.LIGHT_VEHICLE], {
      errorMap: () => ({ message: "License category must be 'motorcycle' or 'light_vehicle'" }),
    }),
    license_expiry_date: z
      .string({ required_error: 'License expiry date is required' })
      .refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime()) && date > new Date();
        },
        { message: 'Driving license expiry date must be a valid future date' }
      ),
  }),
});

export const kycStep2Schema = z.object({
  body: z.object({
    liveness_sdk_token: z
      .string({ required_error: 'Liveness SDK token is required' })
      .trim()
      .min(5, 'Valid liveness SDK token is required'),
  }),
});

export const registerVehicleSchema = z.object({
  body: z.object({
    brta_plate_number: z
      .string({ required_error: 'BRTA registration plate number is required' })
      .trim()
      .regex(brtaPlateRegex, 'Invalid BRTA registration format (expected e.g. "Dhaka Metro-HA 45-8912")'),
    tax_token_number: z
      .string({ required_error: 'Tax token number is required' })
      .trim()
      .min(3, 'Tax token number is required'),
    tax_token_expiry: z
      .string({ required_error: 'Tax token expiry date is required' })
      .refine(
        (val) => {
          const expiryDate = new Date(val);
          if (isNaN(expiryDate.getTime())) return false;
          const minValidDate = new Date();
          minValidDate.setDate(minValidDate.getDate() + 15);
          return expiryDate >= minValidDate;
        },
        { message: 'Tax token must be valid for at least 15 days from today' }
      ),
    vehicle_class: z.enum(
      [VehicleClasses.BIKE, VehicleClasses.CAR_SEDAN, VehicleClasses.MICROBUS],
      { errorMap: () => ({ message: "Vehicle class must be 'bike', 'car_sedan', or 'microbus'" }) }
    ),
    brand: z.string({ required_error: 'Vehicle brand is required' }).trim().min(2),
    model_name: z.string({ required_error: 'Vehicle model is required' }).trim().min(1),
    color: z.string({ required_error: 'Vehicle color is required' }).trim().min(2),
  }),
});

export const toggleOnlineSchema = z.object({
  body: z.object({
    is_online: z.boolean({ required_error: 'is_online boolean flag is required' }),
    current_coordinates: z
      .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
      .optional(),
  }),
});

export const purchaseCommissionPassSchema = z.object({
  body: z.object({
    pass_type: z.enum([CommissionPassTypes.DAILY, CommissionPassTypes.WEEKLY], {
      errorMap: () => ({ message: "Pass type must be 'daily' or 'weekly'" }),
    }),
    payment_method: z.enum(['bkash', 'nagad', 'wallet'], {
      errorMap: () => ({ message: "Payment method must be 'bkash', 'nagad', or 'wallet'" }),
    }),
  }),
});
