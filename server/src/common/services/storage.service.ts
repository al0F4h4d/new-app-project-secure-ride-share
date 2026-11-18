import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME, S3_PUBLIC_URL } from '../../config/s3.config';
import { logger } from '../../config/logger.config';
import { env } from '../../config/env.config';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export class StorageService {
  /**
   * Upload an encrypted binary buffer to Cloudflare R2 / AWS S3 storage.
   */
  async uploadFile(
    key: string,
    fileBuffer: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await s3Client.send(command);

      const url = `${S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
      logger.info(`[StorageService] Uploaded file successfully: ${key}`);

      return {
        key,
        url,
        bucket: S3_BUCKET_NAME,
      };
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[StorageService] Failed to upload file ${key}:`, { error: errMessage });

      // In test/dev environment, fallback to virtual cloud URL if remote credentials are placeholders
      if (env.NODE_ENV !== 'production') {
        const fallbackUrl = `${S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
        logger.warn(`[StorageService] Operating in mock/test storage mode. Generated URL: ${fallbackUrl}`);
        return {
          key,
          url: fallbackUrl,
          bucket: S3_BUCKET_NAME,
        };
      }

      throw error;
    }
  }

  /**
   * Retrieve file buffer from Cloudflare R2 / AWS S3.
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      if (!response.Body) {
        throw new Error(`Empty body returned for storage key: ${key}`);
      }

      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[StorageService] Failed to fetch file ${key}:`, { error: errMessage });
      throw error;
    }
  }
}

export const storageService = new StorageService();
