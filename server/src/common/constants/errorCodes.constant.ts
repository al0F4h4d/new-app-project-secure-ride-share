export const ErrorCodes = {
  // Authentication & Identity
  AUTH_INVALID_PHONE: 'AUTH_INVALID_PHONE',
  AUTH_OTP_RATE_LIMIT: 'AUTH_OTP_RATE_LIMIT',
  AUTH_INVALID_OTP: 'AUTH_INVALID_OTP',
  AUTH_OTP_EXPIRED: 'AUTH_OTP_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  AUTH_NID_BLACKLISTED: 'AUTH_NID_BLACKLISTED',
  AUTH_DEVICE_BANNED: 'AUTH_DEVICE_BANNED',
  AUTH_FORBIDDEN_ROLE: 'AUTH_FORBIDDEN_ROLE',
  AUTH_APP_UPGRADE_REQ: 'AUTH_APP_UPGRADE_REQ',
  AUTH_APP_UPGRADE_REQUIRED: 'AUTH_APP_UPGRADE_REQUIRED',

  // Driver Compliance & KYC
  DRIVER_KYC_PENDING: 'DRIVER_KYC_PENDING',
  DRIVER_LOCKOUT_ACTIVE: 'DRIVER_LOCKOUT_ACTIVE',
  DRIVER_FACIAL_MISMATCH: 'DRIVER_FACIAL_MISMATCH',
  DRIVER_TAX_TOKEN_EXP: 'DRIVER_TAX_TOKEN_EXP',
  DRIVER_NO_ACTIVE_VEHICLE: 'DRIVER_NO_ACTIVE_VEHICLE',
  DRIVER_WALLET_DEBT_LIMIT: 'DRIVER_WALLET_DEBT_LIMIT',

  // Dispatch & Geofencing
  DISPATCH_QUOTE_EXPIRED: 'DISPATCH_QUOTE_EXPIRED',
  DISPATCH_NO_DRIVERS: 'DISPATCH_NO_DRIVERS',
  DISPATCH_OFFER_CLAIMED: 'DISPATCH_OFFER_CLAIMED',
  DISPATCH_CONCURRENT_RIDE: 'DISPATCH_CONCURRENT_RIDE',
  DISPATCH_TIER_MISMATCH: 'DISPATCH_TIER_MISMATCH',
  DISPATCH_INTEGRITY_FAIL: 'DISPATCH_INTEGRITY_FAIL',

  // Trip Lifecycle
  TRIP_NOT_FOUND: 'TRIP_NOT_FOUND',
  TRIP_STATE_INVALID: 'TRIP_STATE_INVALID',
  TRIP_OTP_INVALID: 'TRIP_OTP_INVALID',
  TRIP_ALREADY_CANCELED: 'TRIP_ALREADY_CANCELED',

  // Payments & Ledger
  PAYMENT_GATEWAY_DOWN: 'PAYMENT_GATEWAY_DOWN',
  PAYMENT_MFS_SIG_INVALID: 'PAYMENT_MFS_SIG_INVALID',
  WALLET_INSUFFICIENT: 'WALLET_INSUFFICIENT',
  WALLET_MIN_CASHOUT: 'WALLET_MIN_CASHOUT',

  // Safety & SOS
  SAFETY_SOS_ACTIVE: 'SAFETY_SOS_ACTIVE',

  // Common Platform Errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  SYS_SERVER_ERROR: 'SYS_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ErrorDetailMapping {
  statusCode: number;
  message: string;
  message_bn: string;
}

export const ErrorCodeMap: Record<string, ErrorDetailMapping> = {
  [ErrorCodes.AUTH_INVALID_PHONE]: {
    statusCode: 400,
    message: 'Invalid Bangladeshi mobile number format.',
    message_bn: 'সঠিক বাংলাদেশী মোবাইল নম্বর প্রদান করুন।',
  },
  [ErrorCodes.AUTH_OTP_RATE_LIMIT]: {
    statusCode: 429,
    message: 'Too many OTP requests. Please wait.',
    message_bn: 'আপনি খুব বেশিবার চেষ্টা করেছেন। কিছুক্ষণ অপেক্ষা করুন।',
  },
  [ErrorCodes.AUTH_INVALID_OTP]: {
    statusCode: 400,
    message: 'Incorrect 6-digit OTP code.',
    message_bn: 'ওটিপি কোডটি সঠিক নয়।',
  },
  [ErrorCodes.AUTH_OTP_EXPIRED]: {
    statusCode: 410,
    message: 'OTP code has expired.',
    message_bn: 'ওটিপির মেয়াদ শেষ হয়ে গেছে।',
  },
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: {
    statusCode: 401,
    message: 'Incorrect mobile number or password.',
    message_bn: 'মোবাইল নম্বর অথবা পাসওয়ার্ড ভুল।',
  },
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: {
    statusCode: 401,
    message: 'Access token expired. Please refresh session.',
    message_bn: 'আপনার সেশনের মেয়াদ শেষ। অনুগ্রহ করে রিফ্রেশ করুন।',
  },
  [ErrorCodes.AUTH_TOKEN_REVOKED]: {
    statusCode: 401,
    message: 'Session revoked due to concurrent login.',
    message_bn: 'অন্য ডিভাইসে লগইন করার কারণে সেশন বন্ধ হয়েছে।',
  },
  [ErrorCodes.AUTH_NID_BLACKLISTED]: {
    statusCode: 403,
    message: 'This NID is permanently blacklisted.',
    message_bn: 'এই জাতীয় পরিচয়পত্রটি প্ল্যাটফর্মে নিষিদ্ধ।',
  },
  [ErrorCodes.AUTH_DEVICE_BANNED]: {
    statusCode: 403,
    message: 'Hardware banned due to 3-strike violations.',
    message_bn: 'প্ল্যাটফর্মের নিয়ম ভঙ্গের কারণে ডিভাইসটি নিষিদ্ধ।',
  },
  [ErrorCodes.AUTH_FORBIDDEN_ROLE]: {
    statusCode: 403,
    message: 'Insufficient permissions for this action.',
    message_bn: 'আপনার এই অ্যাকশনটি সম্পন্ন করার অনুমতি নেই।',
  },
  [ErrorCodes.AUTH_APP_UPGRADE_REQ]: {
    statusCode: 426,
    message: 'App update required to continue.',
    message_bn: 'সেবা চালিয়ে যেতে অ্যাপটি আপডেট করুন।',
  },
  [ErrorCodes.AUTH_APP_UPGRADE_REQUIRED]: {
    statusCode: 426,
    message: 'App update required to continue.',
    message_bn: 'সেবা চালিয়ে যেতে অ্যাপটি আপডেট করুন।',
  },
  [ErrorCodes.DRIVER_KYC_PENDING]: {
    statusCode: 403,
    message: 'Driver account under regulatory review.',
    message_bn: 'আপনার ড্রাইভার অ্যাকাউন্টটি রিভিউতে রয়েছে।',
  },
  [ErrorCodes.DRIVER_LOCKOUT_ACTIVE]: {
    statusCode: 423,
    message: 'Account temporarily locked for 1 hour.',
    message_bn: 'অ্যাকাউন্টটি ১ ঘণ্টার জন্য সাময়িক লক করা হয়েছে।',
  },
  [ErrorCodes.DRIVER_FACIAL_MISMATCH]: {
    statusCode: 422,
    message: 'Live selfie does not match NID photograph.',
    message_bn: 'লাইভ সেলফির সাথে এনআইডির ছবির মিল পাওয়া যায়নি।',
  },
  [ErrorCodes.DRIVER_TAX_TOKEN_EXP]: {
    statusCode: 422,
    message: 'BRTA Tax token expired or near expiration.',
    message_bn: 'বিআরটিএ ট্যাক্স টোকেনটির মেয়াদ শেষ হয়ে গেছে।',
  },
  [ErrorCodes.DRIVER_NO_ACTIVE_VEHICLE]: {
    statusCode: 400,
    message: 'No approved vehicle activated for online duty.',
    message_bn: 'আপনার কোনো সক্রিয় গাড়ি নির্বাচন করা নেই।',
  },
  [ErrorCodes.DRIVER_WALLET_DEBT_LIMIT]: {
    statusCode: 403,
    message: 'Wallet balance below limit (-৳500.00).',
    message_bn: 'আপনার ওয়ালেটের বকেয়া ঋণসীমা অতিক্রম করেছে।',
  },
  [ErrorCodes.DISPATCH_QUOTE_EXPIRED]: {
    statusCode: 410,
    message: 'Upfront fare quotation expired.',
    message_bn: 'ভাড়ার কোটেশনের মেয়াদ শেষ হয়ে গেছে।',
  },
  [ErrorCodes.DISPATCH_NO_DRIVERS]: {
    statusCode: 404,
    message: 'No captains found within 4km radius.',
    message_bn: 'এই মুহূর্তে আশেপাশে কোনো ক্যাপ্টেন পাওয়া যায়নি।',
  },
  [ErrorCodes.DISPATCH_OFFER_CLAIMED]: {
    statusCode: 409,
    message: 'Offer claimed by another captain or expired.',
    message_bn: 'অফারটির সময় শেষ বা অন্য ক্যাপ্টেন গ্রহণ করেছেন।',
  },
  [ErrorCodes.DISPATCH_CONCURRENT_RIDE]: {
    statusCode: 409,
    message: 'You already have an active ride in progress.',
    message_bn: 'আপনার ইতিমধ্যে একটি রাইড চলমান রয়েছে।',
  },
  [ErrorCodes.DISPATCH_TIER_MISMATCH]: {
    statusCode: 422,
    message: 'Vertical elevation tier mismatch (Flyover).',
    message_bn: 'ফ্লাইওভার ও নিচের রাস্তার উচ্চতার অমিল পাওয়া গেছে।',
  },
  [ErrorCodes.DISPATCH_INTEGRITY_FAIL]: {
    statusCode: 403,
    message: 'Device integrity verification failed.',
    message_bn: 'ডিভাইসের সিকিউরিটি ভেরিফিকেশন ব্যর্থ হয়েছে।',
  },
  [ErrorCodes.TRIP_NOT_FOUND]: {
    statusCode: 404,
    message: 'Specified trip record does not exist.',
    message_bn: 'ট্রিপটির কোনো তথ্য পাওয়া যায়নি।',
  },
  [ErrorCodes.TRIP_STATE_INVALID]: {
    statusCode: 400,
    message: 'Action forbidden in current trip state.',
    message_bn: 'বর্তমান ট্রিপ স্ট্যাটাসে এই কাজটি করা সম্ভব নয়।',
  },
  [ErrorCodes.TRIP_OTP_INVALID]: {
    statusCode: 400,
    message: 'Incorrect 4-digit pickup code.',
    message_bn: 'পিকআপ ওটিপি কোডটি সঠিক নয়।',
  },
  [ErrorCodes.TRIP_ALREADY_CANCELED]: {
    statusCode: 409,
    message: 'Trip was already canceled by other party.',
    message_bn: 'অপরপক্ষ থেকে রাইডটি ইতিমধ্যে বাতিল করা হয়েছে।',
  },
  [ErrorCodes.PAYMENT_GATEWAY_DOWN]: {
    statusCode: 503,
    message: 'Digital payment gateway experiencing downtime.',
    message_bn: 'বিকাশ/নগদ গেটওয়ে সাময়িকভাবে অনুপলব্ধ রয়েছে।',
  },
  [ErrorCodes.PAYMENT_MFS_SIG_INVALID]: {
    statusCode: 401,
    message: 'Unauthorized webhook callback signature.',
    message_bn: 'অবৈধ পেমেন্ট কলব্যাক সিগনেচার।',
  },
  [ErrorCodes.WALLET_INSUFFICIENT]: {
    statusCode: 400,
    message: 'Insufficient wallet balance for cash-out.',
    message_bn: 'ক্যাশ-আউটের জন্য প্রয়োজনীয় ব্যালেন্স নেই।',
  },
  [ErrorCodes.WALLET_MIN_CASHOUT]: {
    statusCode: 400,
    message: 'Minimum cash-out amount is ৳100.00.',
    message_bn: 'সর্বনিম্ন ক্যাশ-আউট পরিমাণ ১০০.০০ টাকা।',
  },
  [ErrorCodes.SAFETY_SOS_ACTIVE]: {
    statusCode: 409,
    message: 'Emergency SOS is already active for this ride.',
    message_bn: 'এই ট্রিপটিতে ইতিমধ্যে ইমার্জেন্সি এসওএস চালু আছে।',
  },
  [ErrorCodes.VALIDATION_FAILED]: {
    statusCode: 400,
    message: 'The submitted payload contains validation errors.',
    message_bn: 'আপনার দেওয়া তথ্যগুলোতে ত্রুটি রয়েছে। অনুগ্রহ করে সংশোধন করুন।',
  },
  [ErrorCodes.RESOURCE_NOT_FOUND]: {
    statusCode: 404,
    message: 'Requested resource was not found.',
    message_bn: 'অনুরোধকৃত রিসোর্সটি খুঁজে পাওয়া যায়নি।',
  },
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: {
    statusCode: 429,
    message: 'Too many requests. Please slow down.',
    message_bn: 'অতিরিক্ত অনুরোধ করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।',
  },
  [ErrorCodes.CIRCUIT_BREAKER_OPEN]: {
    statusCode: 503,
    message: 'Service is temporarily degraded. Please try again later.',
    message_bn: 'সার্ভিসটি সাময়িকভাবে ডাউন রয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
  },
  [ErrorCodes.SYS_SERVER_ERROR]: {
    statusCode: 500,
    message: 'Internal server error. Incident logged.',
    message_bn: 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে। দ্রুত সমাধান করা হচ্ছে।',
  },
};

