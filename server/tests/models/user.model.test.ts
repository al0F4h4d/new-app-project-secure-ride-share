import { describe, it, expect } from '@jest/globals';
import { User } from '../../src/models/user.model';
import { UserRoles, DeletionStatuses } from '../../src/common/constants/roles.constant';

describe('User Model Schema & Validation Unit Test', () => {
  it('should validate a valid user document without errors', () => {
    const validUserData = {
      phone_number: '+8801712345678',
      email: 'test.user@secureride.com.bd',
      password_hash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      role: UserRoles.PASSENGER,
      full_name: 'Tanvir Hossain',
      emergency_contacts: [
        {
          name: 'Rahim Hossain',
          phone_number: '+8801812345678',
          relationship: 'Brother',
        },
      ],
      saved_addresses: [
        {
          label: 'Home',
          address_text: 'Dhanmondi 32, Dhaka',
          location: {
            type: 'Point',
            coordinates: [90.3742, 23.7533], // [lng, lat]
          },
        },
      ],
      language_preference: 'bn',
      deletion_status: DeletionStatuses.ACTIVE,
    };

    const user = new User(validUserData);
    const validationError = user.validateSync();

    expect(validationError).toBeUndefined();
    expect(user.phone_number).toBe('+8801712345678');
    expect(user.rating_avg).toBe(5.0);
    expect(parseFloat(user.passenger_wallet_balance.toString())).toBe(0.0);
  });

  it('should fail validation if phone number does not match BD regex', () => {
    const invalidUser = new User({
      phone_number: '01234567890', // Invalid operator code
      password_hash: 'dummyhash',
      role: UserRoles.PASSENGER,
      full_name: 'Invalid Phone',
    });

    const error = invalidUser.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['phone_number']).toBeDefined();
    expect(error?.errors['phone_number'].message).toContain('valid Bangladeshi phone number');
  });

  it('should throw ValidationError when attempting to configure more than 3 emergency contacts', () => {
    const userWithExcessContacts = new User({
      phone_number: '+8801912345678',
      password_hash: 'dummyhash',
      role: UserRoles.PASSENGER,
      full_name: 'Excess Contacts User',
      emergency_contacts: [
        { name: 'Contact 1', phone_number: '+8801711111111', relationship: 'Friend' },
        { name: 'Contact 2', phone_number: '+8801722222222', relationship: 'Spouse' },
        { name: 'Contact 3', phone_number: '+8801733333333', relationship: 'Parent' },
        { name: 'Contact 4', phone_number: '+8801744444444', relationship: 'Sibling' },
      ],
    });

    const error = userWithExcessContacts.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['emergency_contacts']).toBeDefined();
    expect(error?.errors['emergency_contacts'].message).toContain(
      'A maximum of 3 emergency contacts can be configured'
    );
  });

  it('should reject invalid role enum', () => {
    const userWithInvalidRole = new User({
      phone_number: '+8801799999999',
      password_hash: 'dummyhash',
      role: 'super_hacker' as any,
      full_name: 'Hacker User',
    });

    const error = userWithInvalidRole.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['role']).toBeDefined();
  });
});
