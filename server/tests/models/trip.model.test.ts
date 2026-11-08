import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { Trip } from '../../src/models/trip.model';
import {
  RideStatuses,
  VehicleClasses,
  PaymentMethods,
} from '../../src/common/constants/roles.constant';

describe('Trip Model Schema & Validation Unit Test', () => {
  it('should validate a valid trip document without errors', () => {
    const validTripData = {
      trip_code: 'TRX-20261106-0001',
      passenger_id: new mongoose.Types.ObjectId(),
      pickup_address: 'Banani 11, Dhaka',
      pickup_geo: {
        type: 'Point',
        coordinates: [90.4043, 23.7937], // [lng, lat]
      },
      dropoff_address: 'Gulshan 2 Circle, Dhaka',
      dropoff_geo: {
        type: 'Point',
        coordinates: [90.4174, 23.7925],
      },
      status: RideStatuses.REQUESTED,
      vehicle_class: VehicleClasses.BIKE,
      upfront_fare: mongoose.Types.Decimal128.fromString('120.00'),
      surge_multiplier: 1.25,
      payment_method: PaymentMethods.BKASH,
      pickup_otp_hash: 'sample_otp_hash_123',
    };

    const trip = new Trip(validTripData);
    const error = trip.validateSync();

    expect(error).toBeUndefined();
    expect(trip.status).toBe(RideStatuses.REQUESTED);
    expect(trip.rescue_ride).toBe(false);
    expect(trip.route_breadcrumbs).toHaveLength(0);
  });

  it('should reject negative upfront fare', () => {
    const tripWithNegativeFare = new Trip({
      trip_code: 'TRX-20261106-0002',
      passenger_id: new mongoose.Types.ObjectId(),
      pickup_address: 'Address',
      pickup_geo: { type: 'Point', coordinates: [90.4043, 23.7937] },
      dropoff_address: 'Destination',
      dropoff_geo: { type: 'Point', coordinates: [90.4174, 23.7925] },
      status: RideStatuses.REQUESTED,
      vehicle_class: VehicleClasses.BIKE,
      upfront_fare: mongoose.Types.Decimal128.fromString('-50.00'),
      payment_method: PaymentMethods.CASH,
      pickup_otp_hash: 'hash',
    });

    const error = tripWithNegativeFare.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['upfront_fare']).toBeDefined();
    expect(error?.errors['upfront_fare'].message).toContain('Upfront fare cannot be negative');
  });

  it('should reject surge multiplier exceeding 1.50 maximum cap', () => {
    const tripWithExcessSurge = new Trip({
      trip_code: 'TRX-20261106-0003',
      passenger_id: new mongoose.Types.ObjectId(),
      pickup_address: 'Address',
      pickup_geo: { type: 'Point', coordinates: [90.4043, 23.7937] },
      dropoff_address: 'Destination',
      dropoff_geo: { type: 'Point', coordinates: [90.4174, 23.7925] },
      status: RideStatuses.REQUESTED,
      vehicle_class: VehicleClasses.CAR_SEDAN,
      upfront_fare: mongoose.Types.Decimal128.fromString('250.00'),
      surge_multiplier: 1.75, // Exceeds max 1.50 cap
      payment_method: PaymentMethods.NAGAD,
      pickup_otp_hash: 'hash',
    });

    const error = tripWithExcessSurge.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['surge_multiplier']).toBeDefined();
  });

  it('should accept interrupted status', () => {
    const interruptedTrip = new Trip({
      trip_code: 'TRX-20261106-0004',
      passenger_id: new mongoose.Types.ObjectId(),
      pickup_address: 'Address',
      pickup_geo: { type: 'Point', coordinates: [90.4043, 23.7937] },
      dropoff_address: 'Destination',
      dropoff_geo: { type: 'Point', coordinates: [90.4174, 23.7925] },
      status: RideStatuses.INTERRUPTED,
      vehicle_class: VehicleClasses.MICROBUS,
      upfront_fare: mongoose.Types.Decimal128.fromString('400.00'),
      payment_method: PaymentMethods.BKASH,
      pickup_otp_hash: 'hash',
    });

    const error = interruptedTrip.validateSync();
    expect(error).toBeUndefined();
    expect(interruptedTrip.status).toBe(RideStatuses.INTERRUPTED);
  });
});

