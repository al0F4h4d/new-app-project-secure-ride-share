import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, UpgradeRequiredError, FieldValidationError } from '../errors/appError';
import { ErrorCodes } from '../constants/errorCodes.constant';
import { logger } from '../../config/logger.config';
import { env } from '../../config/env.config';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] || req.headers['x-correlation-id'] || 'req_unknown') as string;
  const path = req.originalUrl || req.url;

  // 1. Check if error is an instance of AppError
  if (err instanceof AppError) {
    logger.warn(`Operational AppError: [${err.errorCode}] - ${err.message}`, {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      requestId,
      path,
      method: req.method,
    });

    const errorResponse: Record<string, unknown> = {
      success: false,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      type: `https://errors.secride.bd/errors/${err.errorCode}`,
      message: err.message,
      message_bn: err.message_bn,
      errors: err.errors,
      ...(err.recoveryAction ? { recoveryAction: err.recoveryAction } : {}),
      retryable: err.retryable,
      ...(err.cooldownSeconds ? { cooldownSeconds: err.cooldownSeconds } : {}),
      ...(err instanceof UpgradeRequiredError && err.data ? { data: err.data } : {}),
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path,
      },
    };

    if (env.NODE_ENV !== 'production' && err.stack) {
      errorResponse.stack = err.stack;
    }

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // 2. Check if error is a Zod validation error
  if (err instanceof ZodError) {
    const fieldErrors: FieldValidationError[] = err.errors.map((e) => ({
      field: e.path.join('.'),
      rule: e.code,
      message: e.message,
    }));

    logger.warn('Zod Schema Validation Failure:', {
      requestId,
      path,
      errors: fieldErrors,
    });

    const errorResponse: Record<string, unknown> = {
      success: false,
      statusCode: 400,
      errorCode: ErrorCodes.VALIDATION_FAILED,
      type: `https://errors.secride.bd/errors/${ErrorCodes.VALIDATION_FAILED}`,
      message: `The submitted payload contains ${fieldErrors.length} invalid field(s).`,
      message_bn: `আপনার দেওয়া তথ্যগুলোতে ${fieldErrors.length} টি ত্রুটি রয়েছে। অনুগ্রহ করে সংশোধন করুন।`,
      errors: fieldErrors,
      recoveryAction: 'CORRECT_INVALID_FIELDS',
      retryable: false,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path,
      },
    };

    if (env.NODE_ENV !== 'production' && err.stack) {
      errorResponse.stack = err.stack;
    }

    res.status(400).json(errorResponse);
    return;
  }

  // 3. Check for Express body-parser JSON syntax errors
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      statusCode: 400,
      errorCode: ErrorCodes.VALIDATION_FAILED,
      type: `https://errors.secride.bd/errors/${ErrorCodes.VALIDATION_FAILED}`,
      message: 'Malformed JSON payload provided.',
      message_bn: 'অনুরোধের ডেটা সঠিক ফরম্যাটে নেই।',
      errors: [],
      recoveryAction: 'CHECK_JSON_SYNTAX',
      retryable: false,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path,
      },
    });
    return;
  }

  // 4. Unhandled Native Exception / System Error (500)
  logger.error('Unhandled System Exception:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    requestId,
    path,
    method: req.method,
  });

  const internalResponse: Record<string, unknown> = {
    success: false,
    statusCode: 500,
    errorCode: ErrorCodes.SYS_SERVER_ERROR,
    type: `https://errors.secride.bd/errors/${ErrorCodes.SYS_SERVER_ERROR}`,
    message: env.NODE_ENV === 'production' 
      ? 'An internal server error occurred. Our engineering team has been alerted.' 
      : err.message,
    message_bn: 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে। দ্রুত সমাধান করা হচ্ছে।',
    errors: [],
    recoveryAction: 'RETRY_LATER',
    retryable: true,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      path,
    },
  };

  if (env.NODE_ENV !== 'production' && err.stack) {
    internalResponse.stack = err.stack;
  }

  res.status(500).json(internalResponse);
};

