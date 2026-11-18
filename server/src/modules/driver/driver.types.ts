import {
  LicenseCategory,
  VehicleClass,
  CommissionPassType,
} from '../../common/constants/roles.constant';

export interface KycStep1Dto {
  nid_number: string;
  license_number: string;
  license_category: LicenseCategory;
  license_expiry_date: string;
}

export interface KycStep1ResponseData {
  ocr_extracted: {
    nid_number: string;
    license_number: string;
    ocr_confidence_score: number;
  };
  step1_completed: true;
  next_step: 'step2-biometrics';
}

export interface KycStep2Dto {
  liveness_sdk_token: string;
}

export interface KycStep2ResponseData {
  verification_status: 'pending';
  face_match_confidence: number;
  estimated_review_time: '15-30 minutes';
}

export interface RegisterVehicleDto {
  brta_plate_number: string;
  tax_token_number: string;
  tax_token_expiry: string;
  vehicle_class: VehicleClass;
  brand: string;
  model_name: string;
  color: string;
}

export interface VehicleResponseData {
  vehicle_id: string;
  brta_plate_number: string;
  vehicle_class: VehicleClass;
  is_approved: boolean;
}

export interface ActivateVehicleResponseData {
  active_vehicle_id: string;
  vehicle_class: VehicleClass;
  brta_plate_number: string;
}

export interface ToggleOnlineDto {
  is_online: boolean;
  current_coordinates?: [number, number];
}

export interface ToggleOnlineResponseData {
  is_online: boolean;
  active_vehicle: string;
  wallet_balance: string;
  commission_pass_active: boolean;
}

export interface PurchaseCommissionPassDto {
  pass_type: CommissionPassType;
  payment_method: 'bkash' | 'nagad' | 'wallet';
}

export interface PurchaseCommissionPassResponseData {
  pass_id: string;
  pass_type: CommissionPassType;
  price_bdt: string;
  activated_at: string;
  expires_at: string;
}
