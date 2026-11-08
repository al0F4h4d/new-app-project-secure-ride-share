import { describe, it, expect, jest } from '@jest/globals';
import { Response } from 'express';
import { sendSuccess } from '../../src/common/utils/response.util';

describe('Response Utility Suite', () => {
  it('should format standard success responses with metadata and timestamp', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockRes = {
      status: mockStatus,
      req: {
        headers: {
          'x-request-id': 'req_test123',
        },
      },
    } as unknown as Response;

    sendSuccess(mockRes, { rideId: 'ride_abc' }, 201, 'Ride created successfully');

    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        statusCode: 201,
        message: 'Ride created successfully',
        data: { rideId: 'ride_abc' },
        meta: expect.objectContaining({
          requestId: 'req_test123',
          timestamp: expect.any(String),
        }),
      })
    );
  });
});

