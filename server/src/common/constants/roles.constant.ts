export const UserRoles = {
  PASSENGER: 'passenger',
  DRIVER: 'driver',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const AdminSubRoles = {
  OPS: 'ops',
  SAFETY: 'safety',
  SUPER: 'super',
} as const;

export type AdminSubRole = (typeof AdminSubRoles)[keyof typeof AdminSubRoles];

export const VehicleClasses = {
  BIKE: 'bike',
  CAR_SEDAN: 'car_sedan',
  MICROBUS: 'microbus',
} as const;

export type VehicleClass = (typeof VehicleClasses)[keyof typeof VehicleClasses];

export const RideStatuses = {
  REQUESTED: 'requested',
  MATCHED: 'matched',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  INTERRUPTED: 'interrupted',
} as const;

export type RideStatus = (typeof RideStatuses)[keyof typeof RideStatuses];

export const PaymentMethods = {
  BKASH: 'bkash',
  NAGAD: 'nagad',
  CASH: 'cash',
} as const;

export type PaymentMethod = (typeof PaymentMethods)[keyof typeof PaymentMethods];

export const PaymentStatuses = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PaymentStatuses)[keyof typeof PaymentStatuses];

export const DriverVerificationStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type DriverVerificationStatus =
  (typeof DriverVerificationStatuses)[keyof typeof DriverVerificationStatuses];

export const LicenseCategories = {
  MOTORCYCLE: 'motorcycle',
  LIGHT_VEHICLE: 'light_vehicle',
} as const;

export type LicenseCategory = (typeof LicenseCategories)[keyof typeof LicenseCategories];

export const WalletTransactionTypes = {
  COMMISSION_DEDUCT: 'commission_deduct',
  TRIP_CREDIT: 'trip_credit',
  TOPUP: 'topup',
  CASHOUT: 'cashout',
  CANCELLATION_CREDIT: 'cancellation_credit',
} as const;

export type WalletTransactionType =
  (typeof WalletTransactionTypes)[keyof typeof WalletTransactionTypes];

export const PassengerWalletTransactionTypes = {
  CASH_CHANGE_CREDIT: 'cash_change_credit',
  LOYALTY_REDEMPTION: 'loyalty_redemption',
  DETOUR_REFUND: 'detour_refund',
  RIDE_FARE_DEDUCTION: 'ride_fare_deduction',
} as const;

export type PassengerWalletTransactionType =
  (typeof PassengerWalletTransactionTypes)[keyof typeof PassengerWalletTransactionTypes];

export const LedgerEntryTypes = {
  DEBIT: 'debit',
  CREDIT: 'credit',
} as const;

export type LedgerEntryType = (typeof LedgerEntryTypes)[keyof typeof LedgerEntryTypes];

export const DeletionStatuses = {
  ACTIVE: 'active',
  PENDING_DELETION: 'pending_deletion',
  DELETED: 'deleted',
} as const;

export type DeletionStatus = (typeof DeletionStatuses)[keyof typeof DeletionStatuses];

export const BanTypes = {
  KYC_FRAUD: 'kyc_fraud',
  VEHICLE_MISMATCH: 'vehicle_mismatch',
  OFFLINE_COLLUSION: 'offline_collusion',
  DEVICE_TAMPER: 'device_tamper',
} as const;

export type BanType = (typeof BanTypes)[keyof typeof BanTypes];

export const CommissionPassTypes = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

export type CommissionPassType =
  (typeof CommissionPassTypes)[keyof typeof CommissionPassTypes];

export const LoyaltyTransactionTypes = {
  EARN: 'earn',
  REDEEM: 'redeem',
  EXPIRED: 'expired',
} as const;

export type LoyaltyTransactionType =
  (typeof LoyaltyTransactionTypes)[keyof typeof LoyaltyTransactionTypes];

export const SosAuditActions = {
  AUDIO_PLAYBACK: 'audio_playback',
  AUDIO_DOWNLOAD: 'audio_download',
  POLICE_999_ESCALATE: 'police_999_escalate',
  CONTACTS_NOTIFIED: 'contacts_notified',
} as const;

export type SosAuditAction = (typeof SosAuditActions)[keyof typeof SosAuditActions];
