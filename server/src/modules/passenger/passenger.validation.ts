import { z } from 'zod';

const bangladeshiPhoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/;

export const updatePassengerProfileSchema = z.object({
  body: z.object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(80, 'Full name must not exceed 80 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .optional()
      .nullable(),
    language_preference: z.enum(['bn', 'en']).optional(),
    profile_photo_url: z
      .string()
      .trim()
      .url('Invalid profile photo URL')
      .optional()
      .nullable(),
  }),
});

const emergencyContactItemSchema = z.object({
  name: z.string({ required_error: 'Contact name is required' }).trim().min(1, 'Contact name is required'),
  phone_number: z
    .string({ required_error: 'Phone number is required' })
    .regex(bangladeshiPhoneRegex, 'Must be a valid Bangladeshi mobile number starting with +8801 or 01'),
  relationship: z.string({ required_error: 'Relationship is required' }).trim().min(1, 'Relationship is required'),
});

export const updateEmergencyContactsSchema = z.object({
  body: z.object({
    emergency_contacts: z
      .array(emergencyContactItemSchema)
      .max(3, 'A maximum of 3 emergency contacts can be configured'),
  }),
});

export const saveAddressSchema = z.object({
  body: z.object({
    label: z.enum(['Home', 'Work', 'Other'], {
      errorMap: () => ({ message: "Label must be 'Home', 'Work', or 'Other'" }),
    }),
    address_text: z
      .string({ required_error: 'Address text is required' })
      .trim()
      .min(3, 'Address text must be at least 3 characters'),
    coordinates: z
      .tuple([
        z.number({ required_error: 'Longitude is required' }).min(-180).max(180),
        z.number({ required_error: 'Latitude is required' }).min(-90).max(90),
      ])
      .or(
        z
          .array(z.number())
          .length(2, 'Coordinates must be an array of [longitude, latitude]')
          .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, {
            message: 'Longitude must be between -180 and 180, and latitude between -90 and 90',
          })
      ),
  }),
});

export const deleteAddressSchema = z.object({
  params: z
    .object({
      label: z.string().optional(),
    })
    .optional(),
  query: z
    .object({
      label: z.string().optional(),
    })
    .optional(),
  body: z
    .object({
      label: z.string().optional(),
    })
    .optional(),
});

export const accountDeletionSchema = z.object({
  body: z.object({
    confirmation_password: z
      .string({ required_error: 'Confirmation password is required' })
      .min(1, 'Confirmation password cannot be empty'),
    feedback_reason: z
      .string()
      .trim()
      .max(500, 'Feedback reason must not exceed 500 characters')
      .optional()
      .nullable(),
  }),
});

