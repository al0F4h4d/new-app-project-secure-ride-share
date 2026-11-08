import { ErrorCodes, ErrorCode, ErrorCodeMap } from '../constants/errorCodes.constant';

export interface FieldValidationError {
  field: string;
  rule?: string;
  expected?: string | number;
  actual?: string | number;
  message?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly message_bn: string;
  public readonly errors: FieldValidationError[];
  public readonly recoveryAction?: string;
  public readonly retryable: boolean;
  public readonly cooldownSeconds?: number;
  public readonly isOperational: boolean;

  constructor(
    errorCode: ErrorCode | string = ErrorCodes.SYS_SERVER_ERROR,
    customMessage?: string,
    customStatusCode?: number,
    options?: {
      message_bn?: string;
      errors?: FieldValidationError[];
      recoveryAction?: string;
      retryable?: boolean;
      cooldownSeconds?: number;
    }
  ) {
    const errorDetail = ErrorCodeMap[errorCode];
    const message = customMessage || errorDetail?.message || 'An unexpected error occurred.';
    super(message);

    this.errorCode = errorCode;
    this.statusCode = customStatusCode || errorDetail?.statusCode || 500;
    this.message_bn = options?.message_bn || errorDetail?.message_bn || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে।';
    this.errors = options?.errors || [];
    this.recoveryAction = options?.recoveryAction;
    this.retryable = options?.retryable ?? false;
    this.cooldownSeconds = options?.cooldownSeconds;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(
    errorCode: ErrorCode | string = ErrorCodes.VALIDATION_FAILED,
    message?: string,
    message_bn?: string,
    errors?: FieldValidationError[]
  ) {
    super(errorCode, message, 400, { message_bn, errors });
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    errorCode: ErrorCode | string = ErrorCodes.AUTH_TOKEN_EXPIRED,
    message?: string,
    message_bn?: string
  ) {
    super(errorCode, message, 401, { message_bn });
  }
}

export class ForbiddenError extends AppError {
  constructor(
    errorCode: ErrorCode | string = ErrorCodes.AUTH_FORBIDDEN_ROLE,
    message?: string,
    message_bn?: string
  ) {
    super(errorCode, message, 403, { message_bn });
  }
}

export class NotFoundError extends AppError {
  constructor(
    errorCode: ErrorCode | string = ErrorCodes.RESOURCE_NOT_FOUND,
    message?: string,
    message_bn?: string
  ) {
    super(errorCode, message, 404, { message_bn });
  }
}

export class ConflictError extends AppError {
  constructor(
    errorCode: ErrorCode | string = ErrorCodes.DISPATCH_CONCURRENT_RIDE,
    message?: string,
    message_bn?: string
  ) {
    super(errorCode, message, 409, { message_bn });
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldValidationError[], message?: string, message_bn?: string) {
    super(ErrorCodes.VALIDATION_FAILED, message, 400, { errors, message_bn });
  }
}

export class UpgradeRequiredError extends AppError {
  public readonly data?: Record<string, unknown>;

  constructor(
    currentVersion: string,
    minVersion: string,
    latestVersion: string,
    storeUrl: string
  ) {
    super(
      ErrorCodes.AUTH_APP_UPGRADE_REQUIRED,
      `Your app version (${currentVersion}) is no longer supported. Please update to version ${latestVersion} to continue using SecureRide.`,
      426,
      {
        message_bn: `আপনার অ্যাপ ভার্সনটি (${currentVersion}) আর সমর্থিত নয়। সেবা চালিয়ে যেতে অনুগ্রহ করে গুগল প্লে স্টোর থেকে ভার্সন ${latestVersion} আপডেট করুন।`,
        recoveryAction: 'NAVIGATE_TO_APP_STORE',
      }
    );
    this.data = {
      current_version: currentVersion,
      minimum_supported_version: minVersion,
      latest_version: latestVersion,
      store_url: storeUrl,
      force_update: true,
    };
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please slow down and wait.',
      429,
      {
        message_bn: 'অতিরিক্ত অনুরোধ করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।',
        cooldownSeconds: retryAfterSeconds,
        retryable: true,
      }
    );
  }
}

export class InternalServerError extends AppError {
  constructor(message?: string) {
    super(ErrorCodes.SYS_SERVER_ERROR, message, 500);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(errorCode = ErrorCodes.PAYMENT_GATEWAY_DOWN, message?: string, message_bn?: string) {
    super(errorCode, message, 503, { message_bn, retryable: true });
  }
}

