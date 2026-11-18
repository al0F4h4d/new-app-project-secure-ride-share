import { describe, it, expect } from '@jest/globals';
import {
  updateEmergencyContactsSchema,
  updatePassengerProfileSchema,
  saveAddressSchema,
  accountDeletionSchema,
} from '../../src/modules/passenger/passenger.validation';

describe('Passenger Validation Schemas Unit Tests', () => {
  describe('updateEmergencyContactsSchema', () => {
    it('should reject when 4 emergency contacts are submitted with max limit error', async () => {
      const payload = {
        body: {
          emergency_contacts: [
            { name: 'Contact 1', phone_number: '+8801711111111', relationship: 'Mother' },
            { name: 'Contact 2', phone_number: '+8801822222222', relationship: 'Father' },
            { name: 'Contact 3', phone_number: '+8801933333333', relationship: 'Brother' },
            { name: 'Contact 4', phone_number: '+8801544444444', relationship: 'Sister' },
          ],
        },
      };

      await expect(updateEmergencyContactsSchema.parseAsync(payload)).rejects.toThrow(
        /A maximum of 3 emergency contacts can be configured/
      );
    });

    it('should accept 3 valid Bangladeshi emergency contacts', async () => {
      const payload = {
        body: {
          emergency_contacts: [
            { name: 'Contact 1', phone_number: '01711111111', relationship: 'Mother' },
            { name: 'Contact 2', phone_number: '+8801822222222', relationship: 'Father' },
            { name: 'Contact 3', phone_number: '+8801933333333', relationship: 'Spouse' },
          ],
        },
      };

      const result = await updateEmergencyContactsSchema.parseAsync(payload);
      expect(result.body.emergency_contacts).toHaveLength(3);
    });

    it('should reject invalid mobile number in emergency contact', async () => {
      const payload = {
        body: {
          emergency_contacts: [
            { name: 'Invalid Phone Contact', phone_number: '1234567890', relationship: 'Friend' },
          ],
        },
      };

      await expect(updateEmergencyContactsSchema.parseAsync(payload)).rejects.toThrow(
        /Must be a valid Bangladeshi mobile number/
      );
    });
  });

  describe('updatePassengerProfileSchema', () => {
    it('should validate correctly for partial profile update', async () => {
      const payload = {
        body: {
          full_name: 'Rafiqul Islam',
          language_preference: 'bn',
        },
      };

      const result = await updatePassengerProfileSchema.parseAsync(payload);
      expect(result.body.full_name).toBe('Rafiqul Islam');
      expect(result.body.language_preference).toBe('bn');
    });

    it('should reject name shorter than 2 characters', async () => {
      const payload = {
        body: {
          full_name: 'A',
        },
      };

      await expect(updatePassengerProfileSchema.parseAsync(payload)).rejects.toThrow(
        /Full name must be at least 2 characters/
      );
    });

    it('should reject invalid email format', async () => {
      const payload = {
        body: {
          email: 'not-an-email',
        },
      };

      await expect(updatePassengerProfileSchema.parseAsync(payload)).rejects.toThrow(
        /Invalid email address/
      );
    });
  });

  describe('saveAddressSchema', () => {
    it('should accept valid Home bookmark address with geo coordinates', async () => {
      const payload = {
        body: {
          label: 'Home',
          address_text: 'House 12, Road 5, Dhanmondi, Dhaka',
          coordinates: [90.3742, 23.7461],
        },
      };

      const result = await saveAddressSchema.parseAsync(payload);
      expect(result.body.label).toBe('Home');
      expect(result.body.coordinates).toEqual([90.3742, 23.7461]);
    });

    it('should reject invalid label outside Home, Work, Other', async () => {
      const payload = {
        body: {
          label: 'VacationSpot',
          address_text: 'Coxs Bazar Beach Road',
          coordinates: [91.9833, 21.4272],
        },
      };

      await expect(saveAddressSchema.parseAsync(payload)).rejects.toThrow(
        /Label must be 'Home', 'Work', or 'Other'/
      );
    });

    it('should reject out-of-bounds coordinates', async () => {
      const payload = {
        body: {
          label: 'Work',
          address_text: 'Motijheel C/A',
          coordinates: [200, 100], // invalid lng > 180, lat > 90
        },
      };

      await expect(saveAddressSchema.parseAsync(payload)).rejects.toThrow();
    });
  });

  describe('accountDeletionSchema', () => {
    it('should reject empty confirmation password', async () => {
      const payload = {
        body: {
          confirmation_password: '',
        },
      };

      await expect(accountDeletionSchema.parseAsync(payload)).rejects.toThrow(
        /Confirmation password cannot be empty/
      );
    });

    it('should accept valid confirmation password and feedback reason', async () => {
      const payload = {
        body: {
          confirmation_password: 'SecurePassword123@',
          feedback_reason: 'Relocating to Sylhet',
        },
      };

      const result = await accountDeletionSchema.parseAsync(payload);
      expect(result.body.confirmation_password).toBe('SecurePassword123@');
      expect(result.body.feedback_reason).toBe('Relocating to Sylhet');
    });
  });
});

