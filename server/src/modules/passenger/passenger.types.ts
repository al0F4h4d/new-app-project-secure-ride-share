import { IEmergencyContact, ISavedAddress } from '../../models/user.model';

export interface PassengerProfileResponseData {
  _id: string;
  phone_number: string | null;
  email: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
  passenger_wallet_balance: string;
  rating_avg: number;
  total_ratings_count: number;
  language_preference: 'bn' | 'en';
  emergency_contacts: IEmergencyContact[];
  saved_addresses_count: number;
  deletion_status: string;
  deletion_requested_at?: string | null;
  scheduled_deletion_at?: string | null;
}

export interface UpdatePassengerProfileDto {
  full_name?: string;
  email?: string | null;
  language_preference?: 'bn' | 'en';
  profile_photo_url?: string | null;
}

export interface UpdateEmergencyContactsDto {
  emergency_contacts: IEmergencyContact[];
}

export interface SaveAddressDto {
  label: 'Home' | 'Work' | 'Other';
  address_text: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface SavedAddressResponseData extends ISavedAddress {
  _id?: string;
}

export interface InitiateAccountDeletionDto {
  confirmation_password: string;
  feedback_reason?: string;
}

export interface AccountDeletionResponseData {
  deletion_status: string;
  deletion_requested_at: string;
  scheduled_deletion_at: string;
}

