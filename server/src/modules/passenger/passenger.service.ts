import { User, IEmergencyContact, ISavedAddress } from '../../models/user.model';
import { RefreshToken } from '../../models/refreshToken.model';
import { DeletionStatuses } from '../../common/constants/roles.constant';
import { ErrorCodes } from '../../common/constants/errorCodes.constant';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../../common/errors/appError';
import { verifyPassword } from '../../common/utils/crypto.util';
import {
  PassengerProfileResponseData,
  UpdatePassengerProfileDto,
  SaveAddressDto,
  InitiateAccountDeletionDto,
  AccountDeletionResponseData,
} from './passenger.types';

export class PassengerService {
  /**
   * Retrieve passenger profile details including wallet balance, emergency contacts, and rating.
   */
  async getProfile(userId: string): Promise<PassengerProfileResponseData> {
    const user = await User.findById(userId);

    if (!user || user.deletion_status === DeletionStatuses.DELETED) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Passenger profile not found.',
        'যাত্রী প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    return {
      _id: user._id.toString(),
      phone_number: user.phone_number ?? null,
      email: user.email ?? null,
      full_name: user.full_name ?? null,
      profile_photo_url: user.profile_photo_url ?? null,
      passenger_wallet_balance: user.passenger_wallet_balance
        ? user.passenger_wallet_balance.toString()
        : '0.00',
      rating_avg: user.rating_avg,
      total_ratings_count: user.total_ratings_count,
      language_preference: user.language_preference,
      emergency_contacts: user.emergency_contacts || [],
      saved_addresses_count: user.saved_addresses ? user.saved_addresses.length : 0,
      deletion_status: user.deletion_status,
      deletion_requested_at: user.deletion_requested_at?.toISOString() || null,
      scheduled_deletion_at: user.scheduled_deletion_at?.toISOString() || null,
    };
  }

  /**
   * Update passenger personal info (full_name, email, language_preference, profile_photo_url).
   */
  async updateProfile(
    userId: string,
    dto: UpdatePassengerProfileDto
  ): Promise<{
    full_name: string | null;
    email: string | null;
    language_preference: 'bn' | 'en';
    profile_photo_url: string | null;
  }> {
    const user = await User.findById(userId);

    if (!user || user.deletion_status === DeletionStatuses.DELETED) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Passenger profile not found.',
        'যাত্রী প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email.toLowerCase() !== user.email?.toLowerCase()) {
      const emailInUse = await User.findOne({
        email: dto.email.toLowerCase(),
        _id: { $ne: user._id },
        deletion_status: { $ne: DeletionStatuses.DELETED },
      });

      if (emailInUse) {
        throw new ConflictError(
          ErrorCodes.VALIDATION_FAILED,
          'Email address is already registered to another account.',
          'ইমেইল ঠিকানাটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে ব্যবহৃত হচ্ছে।'
        );
      }
    }

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.email !== undefined) user.email = dto.email ? dto.email.toLowerCase() : null;
    if (dto.language_preference !== undefined) user.language_preference = dto.language_preference;
    if (dto.profile_photo_url !== undefined) user.profile_photo_url = dto.profile_photo_url;

    await user.save();

    return {
      full_name: user.full_name ?? null,
      email: user.email ?? null,
      language_preference: user.language_preference,
      profile_photo_url: user.profile_photo_url ?? null,
    };
  }

  /**
   * Update passenger emergency trusted contacts (enforcing max 3 contacts limit).
   */
  async updateEmergencyContacts(
    userId: string,
    contacts: IEmergencyContact[]
  ): Promise<{ emergency_contacts: IEmergencyContact[] }> {
    if (contacts.length > 3) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        'A maximum of 3 emergency contacts can be configured.',
        'সর্বোচ্চ ৩টি জরুরি যোগাযোগ নম্বর যোগ করা যাবে।'
      );
    }

    const user = await User.findById(userId);

    if (!user || user.deletion_status === DeletionStatuses.DELETED) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Passenger profile not found.',
        'যাত্রী প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    user.emergency_contacts = contacts;
    await user.save();

    return {
      emergency_contacts: user.emergency_contacts,
    };
  }

  /**
   * Save or update bookmark address location (Home, Work, Other).
   */
  async saveAddress(
    userId: string,
    dto: SaveAddressDto
  ): Promise<ISavedAddress> {
    const user = await User.findById(userId);

    if (!user || user.deletion_status === DeletionStatuses.DELETED) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Passenger profile not found.',
        'যাত্রী প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    const newAddress: ISavedAddress = {
      label: dto.label,
      address_text: dto.address_text,
      location: {
        type: 'Point',
        coordinates: dto.coordinates,
      },
    };

    const existingIndex = user.saved_addresses.findIndex((addr) => addr.label === dto.label);
    if (existingIndex !== -1) {
      user.saved_addresses[existingIndex] = newAddress;
    } else {
      user.saved_addresses.push(newAddress);
    }

    await user.save();

    return newAddress;
  }

  /**
   * Retrieve all saved bookmark addresses for passenger.
   */
  async getSavedAddresses(userId: string): Promise<ISavedAddress[]> {
    const user = await User.findById(userId);

    if (!user || user.deletion_status === DeletionStatuses.DELETED) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Passenger profile not found.',
        'যাত্রী প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    return user.saved_addresses || [];
  }

  /**
   * Remove a saved bookmark address by label.
   */
  async deleteSavedAddress(
    userId: string,
    label: string
  ): Promise<{ label: string; message: string }> {
    if (!['Home', 'Work', 'Other'].includes(label)) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        "Address label must be 'Home', 'Work', or 'Other'.",
        "ঠিকানার লেবেল 'Home', 'Work' অথবা 'Other' হতে হবে।"
      );
    }

    const user = await User.findById(userId);

    if (!user || user.deletion_status === DeletionStatuses.DELETED) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Passenger profile not found.',
        'যাত্রী প্রোফাইল খুঁজে পাওয়া যায়নি।'
      );
    }

    const initialLength = user.saved_addresses.length;
    user.saved_addresses = (user.saved_addresses || []).filter((addr) => addr.label !== label);

    if (user.saved_addresses.length === initialLength) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Saved address with label '${label}' not found.`,
        `'${label}' লেবেলের সংরক্ষিত ঠিকানাটি পাওয়া যায়নি।`
      );
    }

    await user.save();

    return {
      label,
      message: `Address '${label}' successfully deleted.`,
    };
  }

  /**
   * Initiate 30-day self-service account deletion lifecycle with password re-verification.
   * Logs out user immediately across all devices by revoking refresh tokens.
   */
  async initiateAccountDeletion(
    userId: string,
    dto: InitiateAccountDeletionDto
  ): Promise<AccountDeletionResponseData> {
    const user = await User.findById(userId);

    if (!user || user.deletion_status === DeletionStatuses.DELETED) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'User account not found.',
        'ব্যবহারকারী অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।'
      );
    }

    // Verify confirmation password with Argon2id
    const isPasswordValid = await verifyPassword(user.password_hash, dto.confirmation_password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Incorrect confirmation password.',
        'নিশ্চিতকরণ পাসওয়ার্ডটি ভুল।'
      );
    }

    const now = new Date();
    const scheduledDeletionAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    user.deletion_status = DeletionStatuses.PENDING_DELETION;
    user.deletion_requested_at = now;
    user.scheduled_deletion_at = scheduledDeletionAt;

    await user.save();

    // Invalidate all active refresh tokens immediately to force logout on all devices
    await RefreshToken.updateMany(
      { user_id: user._id, is_revoked: false },
      { $set: { is_revoked: true } }
    );

    return {
      deletion_status: user.deletion_status,
      deletion_requested_at: now.toISOString(),
      scheduled_deletion_at: scheduledDeletionAt.toISOString(),
    };
  }

  /**
   * Revoke pending account deletion before the 30-day grace period expires.
   */
  async revokeAccountDeletion(
    userId: string
  ): Promise<{ deletion_status: string }> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'User account not found.',
        'ব্যবহারকারী অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।'
      );
    }

    if (user.deletion_status === DeletionStatuses.DELETED) {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_FAILED,
        'Account is permanently deleted and cannot be restored.',
        'অ্যাকাউন্টটি স্থায়ীভাবে মুছে ফেলা হয়েছে এবং পুনরায় সক্রিয় করা যাবে না।'
      );
    }

    user.deletion_status = DeletionStatuses.ACTIVE;
    user.deletion_requested_at = null;
    user.scheduled_deletion_at = null;

    await user.save();

    return {
      deletion_status: DeletionStatuses.ACTIVE,
    };
  }
}

export const passengerService = new PassengerService();

