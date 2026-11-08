import { z } from 'zod';

const bangladeshiPhoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/;
const nidRegex = /^\d{10}$|^\d{17}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-[\]{};:'",.<>/|\\~`]).{8,}$/;

export const sendOtpValidationSchema = z.object({
  body: z.object({
    phone_number: z
      .string({ required_error: 'Phone number is required' })
      .regex(bangladeshiPhoneRegex, 'Must be a valid Bangladeshi mobile number starting with +8801 or 01'),
    nid_number: z
      .string()
      .regex(nidRegex, 'Smart NID must be 10 or 17 digits')
      .optional()
      .nullable(),
    app_signature_hash: z.string().optional().nullable(),
  }),
});

export const verifyOtpValidationSchema = z.object({
  body: z.object({
    phone_number: z
      .string({ required_error: 'Phone number is required' })
      .regex(bangladeshiPhoneRegex, 'Must be a valid Bangladeshi mobile number'),
    otp: z
      .string({ required_error: 'OTP code is required' })
      .regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
  }),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').trim(),
  phone_number: z.string().regex(bangladeshiPhoneRegex, 'Must be a valid Bangladeshi mobile number'),
  relationship: z.string().min(1, 'Relationship is required').trim(),
});

export const registerValidationSchema = z.object({
  body: z.object({
    registration_ticket: z.string().min(1, 'Registration ticket is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        strongPasswordRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    full_name: z.string().min(2, 'Full name must be at least 2 characters').trim(),
    email: z.string().email('Invalid email address').optional().nullable(),
    role: z.enum(['passenger', 'driver'], {
      errorMap: () => ({ message: "Role must be 'passenger' or 'driver'" }),
    }),
    language_preference: z.enum(['bn', 'en']).optional().default('bn'),
    emergency_contacts: z
      .array(emergencyContactSchema)
      .max(3, 'Maximum 3 emergency contacts allowed')
      .optional()
      .default([]),
    bkash_payout_number: z
      .string()
      .regex(bangladeshiPhoneRegex, 'Must be a valid Bangladeshi bKash number')
      .optional()
      .nullable(),
    nagad_payout_number: z
      .string()
      .regex(bangladeshiPhoneRegex, 'Must be a valid Bangladeshi Nagad number')
      .optional()
      .nullable(),
  }),
});

export const loginValidationSchema = z.object({
  body: z.object({
    phone_number: z
      .string({ required_error: 'Phone number is required' })
      .regex(bangladeshiPhoneRegex, 'Must be a valid Bangladeshi mobile number'),
    password: z.string().min(1, 'Password is required'),
    device_fingerprint: z
      .object({
        imei_hash: z.string().optional(),
        android_id: z.string().optional(),
        platform: z.enum(['android', 'ios', 'web']).optional(),
        app_version: z.string().optional(),
      })
      .optional(),
  }),
});

export const refreshTokenValidationSchema = z.object({
  body: z
    .object({
      refresh_token: z.string().optional(),
      device_fingerprint: z
        .object({
          imei_hash: z.string().optional(),
          android_id: z.string().optional(),
          platform: z.enum(['android', 'ios', 'web']).optional(),
          app_version: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

