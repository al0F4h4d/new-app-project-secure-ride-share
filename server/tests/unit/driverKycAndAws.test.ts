import { describe, it, expect } from '@jest/globals';
import { Block, BlockType } from '@aws-sdk/client-textract';
import { ocrService } from '../../src/common/services/ocr.service';
import { rekognitionService } from '../../src/common/services/rekognition.service';
import {
  kycStep1Schema,
  kycStep2Schema,
  registerVehicleSchema,
  purchaseCommissionPassSchema,
  toggleOnlineSchema,
} from '../../src/modules/driver/driver.validation';
import { LicenseCategories, VehicleClasses, CommissionPassTypes } from '../../src/common/constants/roles.constant';

describe('Driver KYC, AWS OCR & Rekognition Unit Tests', () => {
  describe('AWS Textract OCR Service', () => {
    it('should extract Smart NID, license number, and category from structured blocks', () => {
      const mockBlocks: Block[] = [
        { BlockType: BlockType.LINE, Text: 'GOVERNMENT OF BANGLADESH', Confidence: 99.0 },
        { BlockType: BlockType.LINE, Text: 'NATIONAL ID: 5912345678', Confidence: 98.2 },
        { BlockType: BlockType.LINE, Text: 'BRTA DRIVING LICENSE', Confidence: 95.0 },
        { BlockType: BlockType.LINE, Text: 'LICENSE NO: DK0948201', Confidence: 96.5 },
        { BlockType: BlockType.LINE, Text: 'CLASS: MOTORCYCLE', Confidence: 94.0 },
        { BlockType: BlockType.LINE, Text: 'EXPIRY: 2029-05-10', Confidence: 97.0 },
      ];

      const result = ocrService.extractStructuredFields(mockBlocks);

      expect(result.nid_number).toBe('5912345678');
      expect(result.license_number).toBe('DK0948201');
      expect(result.license_category).toBe(LicenseCategories.MOTORCYCLE);
      expect(result.license_expiry_date).toBe('2029-05-10');
      expect(result.ocr_confidence_score).toBeGreaterThanOrEqual(85.0);
    });

    it('should parse light vehicle category correctly', () => {
      const mockBlocks: Block[] = [
        { BlockType: BlockType.LINE, Text: 'BRTA DRIVING LICENSE', Confidence: 95.0 },
        { BlockType: BlockType.LINE, Text: 'CATEGORY: LIGHT VEHICLE (SEDAN / MICROBUS)', Confidence: 92.0 },
      ];

      const result = ocrService.extractStructuredFields(mockBlocks);
      expect(result.license_category).toBe(LicenseCategories.LIGHT_VEHICLE);
    });
  });

  describe('AWS Rekognition CompareFaces Service', () => {
    it('should return isMatch: true when face similarity >= 90%', async () => {
      const selfieBuf = Buffer.from('valid_driver_live_selfie_portrait');
      const nidBuf = Buffer.from('smart_nid_reference_portrait');

      const result = await rekognitionService.compareFaces(selfieBuf, nidBuf, 90);

      expect(result.isMatch).toBe(true);
      expect(result.similarity).toBeGreaterThanOrEqual(90.0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.facial_vector_hash).toHaveLength(64);
    });

    it('should return isMatch: false when face similarity < 90%', async () => {
      const mismatchSelfieBuf = Buffer.from('mismatch_imposter_face_photo');
      const nidBuf = Buffer.from('smart_nid_reference_portrait');

      const result = await rekognitionService.compareFaces(mismatchSelfieBuf, nidBuf, 90);

      expect(result.isMatch).toBe(false);
      expect(result.similarity).toBeLessThan(90.0);
      expect(result.facial_vector_hash).toHaveLength(64);
    });
  });

  describe('Driver Validation Schemas', () => {
    describe('kycStep1Schema', () => {
      it('should validate valid step 1 identity payload', async () => {
        const payload = {
          body: {
            nid_number: '5912345678',
            license_number: 'DK0948201',
            license_category: 'motorcycle',
            license_expiry_date: '2029-12-31',
          },
        };

        const result = await kycStep1Schema.parseAsync(payload);
        expect(result.body.nid_number).toBe('5912345678');
        expect(result.body.license_category).toBe(LicenseCategories.MOTORCYCLE);
      });

      it('should reject invalid Smart NID (not 10 or 17 digits)', async () => {
        const payload = {
          body: {
            nid_number: '12345',
            license_number: 'DK0948201',
            license_category: 'motorcycle',
            license_expiry_date: '2029-12-31',
          },
        };

        await expect(kycStep1Schema.parseAsync(payload)).rejects.toThrow(
          /Smart NID must be 10 or 17 digits/
        );
      });

      it('should reject expired driving license date', async () => {
        const payload = {
          body: {
            nid_number: '5912345678',
            license_number: 'DK0948201',
            license_category: 'motorcycle',
            license_expiry_date: '2020-01-01', // in the past
          },
        };

        await expect(kycStep1Schema.parseAsync(payload)).rejects.toThrow(
          /must be a valid future date/
        );
      });
    });

    describe('kycStep2Schema', () => {
      it('should validate liveness sdk token', async () => {
        const payload = {
          body: {
            liveness_sdk_token: 'tok_live_091823abf',
          },
        };

        const result = await kycStep2Schema.parseAsync(payload);
        expect(result.body.liveness_sdk_token).toBe('tok_live_091823abf');
      });

      it('should reject empty liveness sdk token', async () => {
        const payload = {
          body: {
            liveness_sdk_token: '',
          },
        };

        await expect(kycStep2Schema.parseAsync(payload)).rejects.toThrow();
      });
    });

    describe('registerVehicleSchema', () => {
      it('should accept valid BRTA plate and tax token valid for > 15 days', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 45);

        const payload = {
          body: {
            brta_plate_number: 'Dhaka Metro-HA 45-8912',
            tax_token_number: 'TT-2026-904123',
            tax_token_expiry: futureDate.toISOString().split('T')[0],
            vehicle_class: VehicleClasses.BIKE,
            brand: 'Yamaha',
            model_name: 'FZS V3 ABS',
            color: 'Matte Blue',
          },
        };

        const result = await registerVehicleSchema.parseAsync(payload);
        expect(result.body.brta_plate_number).toBe('Dhaka Metro-HA 45-8912');
        expect(result.body.vehicle_class).toBe('bike');
      });

      it('should reject tax token expiring in less than 15 days', async () => {
        const nearDate = new Date();
        nearDate.setDate(nearDate.getDate() + 5); // only 5 days left

        const payload = {
          body: {
            brta_plate_number: 'Dhaka Metro-HA 45-8912',
            tax_token_number: 'TT-2026-904123',
            tax_token_expiry: nearDate.toISOString().split('T')[0],
            vehicle_class: VehicleClasses.BIKE,
            brand: 'Yamaha',
            model_name: 'FZS V3',
            color: 'Black',
          },
        };

        await expect(registerVehicleSchema.parseAsync(payload)).rejects.toThrow(
          /Tax token must be valid for at least 15 days/
        );
      });
    });

    describe('toggleOnlineSchema & purchaseCommissionPassSchema', () => {
      it('should validate toggle online payload', async () => {
        const payload = {
          body: {
            is_online: true,
            current_coordinates: [90.4043, 23.7937],
          },
        };

        const result = await toggleOnlineSchema.parseAsync(payload);
        expect(result.body.is_online).toBe(true);
        expect(result.body.current_coordinates).toEqual([90.4043, 23.7937]);
      });

      it('should validate commission pass purchase for daily pass', async () => {
        const payload = {
          body: {
            pass_type: CommissionPassTypes.DAILY,
            payment_method: 'bkash',
          },
        };

        const result = await purchaseCommissionPassSchema.parseAsync(payload);
        expect(result.body.pass_type).toBe('daily');
        expect(result.body.payment_method).toBe('bkash');
      });
    });
  });
});
