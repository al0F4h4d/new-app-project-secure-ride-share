import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.config';

// Cloudflare R2 is S3-compatible, endpoint format: https://<accountid>.r2.cloudflarestorage.com
const isCloudflareR2 = Boolean(env.CLOUDFLARE_R2_ACCOUNT_ID && env.CLOUDFLARE_R2_ACCOUNT_ID !== 'dummy_account_id');

export const s3Client = new S3Client({
  region: isCloudflareR2 ? 'auto' : env.AWS_REGION,
  endpoint: isCloudflareR2 
    ? `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com` 
    : undefined,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKET_NAME = env.CLOUDFLARE_R2_BUCKET_NAME;
export const S3_PUBLIC_URL = env.CLOUDFLARE_R2_PUBLIC_URL;

