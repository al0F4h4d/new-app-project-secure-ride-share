import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { errorHandler } from '../../src/common/middlewares/errorHandler.middleware';
import { ConflictError } from '../../src/common/errors/appError';
import { ErrorCodes } from '../../src/common/constants/errorCodes.constant';
import { app } from '../../src/app';

describe('Global RFC 7807 Error Handler Integration Test', () => {
  const testApp = express();
  testApp.use(express.json());

  testApp.get('/throw-conflict', () => {
    throw new ConflictError(
      ErrorCodes.DISPATCH_CONCURRENT_RIDE,
      'Active ride in progress',
      'আপনার ইতিমধ্যে একটি রাইড চলমান রয়েছে।'
    );
  });

  testApp.post('/test-zod', (req: Request, res: Response) => {
    const schema = z.object({
      phoneNumber: z.string().regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Invalid BD phone number'),
      seatCount: z.number().min(1).max(4),
    });

    const parsed = schema.parse(req.body);
    res.json({ success: true, data: parsed });
  });

  testApp.get('/throw-unexpected', () => {
    throw new Error('Unforeseen database crash');
  });

  testApp.use(errorHandler);

  it('should intercept AppError and format into RFC 7807 payload with bilingual message', async () => {
    const res = await request(testApp).get('/throw-conflict');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe(ErrorCodes.DISPATCH_CONCURRENT_RIDE);
    expect(res.body.message_bn).toBe('আপনার ইতিমধ্যে একটি রাইড চলমান রয়েছে।');
    expect(res.body.type).toBe(`https://errors.secride.bd/errors/${ErrorCodes.DISPATCH_CONCURRENT_RIDE}`);
    expect(res.body.meta).toHaveProperty('requestId');
  });

  it('should intercept ZodError and return 400 with detailed invalid fields array', async () => {
    const res = await request(testApp).post('/test-zod').send({
      phoneNumber: '01234567890', // Invalid BD operator
      seatCount: 6, // Exceeds max 4
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe(ErrorCodes.VALIDATION_FAILED);
    expect(res.body.errors).toHaveLength(2);
    expect(res.body.errors[0].field).toBe('phoneNumber');
    expect(res.body.errors[1].field).toBe('seatCount');
  });

  it('should return 404 for nonexistent routes on main app', async () => {
    const res = await request(app).get('/api/v1/nonexistent-endpoint-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
  });
});

