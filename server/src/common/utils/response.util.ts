import { Response, Request } from 'express';

export interface ApiResponseMeta {
  requestId?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message?: string;
  data: T;
  meta: ApiResponseMeta;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
  extraMeta?: Record<string, unknown>
): Response => {
  const req = res.req as Request;
  const requestId = (req?.headers['x-request-id'] || req?.headers['x-correlation-id']) as string | undefined;

  const responseBody: ApiSuccessResponse<T> = {
    success: true,
    statusCode,
    ...(message ? { message } : {}),
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
      ...(extraMeta || {}),
    },
  };

  return res.status(statusCode).json(responseBody);
};

