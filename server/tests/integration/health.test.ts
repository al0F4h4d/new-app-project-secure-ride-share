import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';

describe('Health Check Integration Test', () => {
  it('GET /health should return 200 with service health status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});

