import process from 'node:process';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:5000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:5173'),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_MAX_POOL_SIZE: z.string().default('50').transform((val) => parseInt(val, 10)),

  // Redis
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().default('0').transform((val) => parseInt(val, 10)),
  REDIS_TLS: z.string().optional().default('false').transform((val) => val === 'true'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Encryption (AES-256-GCM 32 bytes = 64 hex characters)
  ENCRYPTION_KEY_HEX: z.string().length(64, 'ENCRYPTION_KEY_HEX must be a 64-character hex string (32 bytes)'),

  // Cloudflare R2
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().default('dummy_account_id'),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().default('dummy_access_key'),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().default('dummy_secret_key'),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().default('secureride-media-dev'),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().default('https://media.secureride.com.bd'),

  // AWS
  AWS_REGION: z.string().default('ap-southeast-1'),
  AWS_ACCESS_KEY_ID: z.string().default('dummy_aws_key'),
  AWS_SECRET_ACCESS_KEY: z.string().default('dummy_aws_secret'),

  // bKash & Nagad
  BKASH_BASE_URL: z.string().default('https://tokenized.sandbox.bka.sh/v1.2.0-beta'),
  BKASH_APP_KEY: z.string().default('dummy_bkash_key'),
  BKASH_APP_SECRET: z.string().default('dummy_bkash_secret'),
  BKASH_USERNAME: z.string().default('dummy_bkash_user'),
  BKASH_PASSWORD: z.string().default('dummy_bkash_pass'),
  NAGAD_BASE_URL: z.string().default('http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'),
  NAGAD_MERCHANT_ID: z.string().default('dummy_nagad_merchant'),
  NAGAD_PG_PUBLIC_KEY: z.string().default('dummy_nagad_pg_pub_key'),
  NAGAD_MERCHANT_PRIVATE_KEY: z.string().default('dummy_nagad_priv_key'),

  // SMS
  SSL_WIRELESS_API_KEY: z.string().default('dummy_ssl_key'),
  SSL_WIRELESS_SID: z.string().default('dummy_ssl_sid'),
  SSL_WIRELESS_URL: z.string().default('https://smsplus.sslwireless.com/api/v3/send-sms'),
  TWILIO_ACCOUNT_SID: z.string().default('dummy_twilio_sid'),
  TWILIO_AUTH_TOKEN: z.string().default('dummy_twilio_auth_token'),
  TWILIO_SERVICE_SID: z.string().default('dummy_twilio_service_sid'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
    });
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;

