import { UserRole, AdminSubRole } from '../../common/constants/roles.constant';
import { IEmergencyContact } from '../../models/user.model';
import { IDeviceFingerprint } from '../../models/refreshToken.model';

export interface SendOtpDto {
  phone_number: string;
  nid_number?: string;
  app_signature_hash?: string;
}

export interface SendOtpResponseData {
  phone_number: string;
  expires_in_seconds: number;
  resend_available_in_seconds: number;
}

export interface VerifyOtpDto {
  phone_number: string;
  otp: string;
}

export interface UserSummaryData {
  _id: string;
  phone_number: string;
  role: UserRole;
  full_name: string;
  language_preference: 'bn' | 'en';
  email?: string | null;
  passenger_wallet_balance?: string;
  rating_avg?: number;
  driver_profile_id?: string;
  verification_status?: string;
  admin_sub_role?: AdminSubRole | null;
}

export interface VerifyOtpNewUserResponseData {
  is_new_user: true;
  registration_ticket: string;
  ticket_expires_in: number;
}

export interface VerifyOtpExistingUserResponseData {
  is_new_user: false;
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: UserSummaryData;
}

export type VerifyOtpResponseData = VerifyOtpNewUserResponseData | VerifyOtpExistingUserResponseData;

export interface RegisterUserDto {
  registration_ticket: string;
  password: string;
  full_name: string;
  email?: string | null;
  role: 'passenger' | 'driver';
  language_preference?: 'bn' | 'en';
  emergency_contacts?: IEmergencyContact[];
  bkash_payout_number?: string;
  nagad_payout_number?: string;
}

export interface RegisterResponseData {
  access_token: string;
  user: UserSummaryData;
}

export interface LoginDto {
  phone_number: string;
  password: string;
  device_fingerprint?: IDeviceFingerprint;
}

export interface LoginResponseData {
  access_token: string;
  expires_in: number;
  user: UserSummaryData;
}

export interface RefreshTokenDto {
  refresh_token?: string;
  device_fingerprint?: IDeviceFingerprint;
}

export interface RefreshTokenResponseData {
  access_token: string;
  expires_in: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

