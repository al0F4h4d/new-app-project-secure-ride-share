import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { WalletTransaction } from '../../src/models/walletTransaction.model';
import { PassengerWalletTransaction } from '../../src/models/passengerWalletTransaction.model';
import { Payment } from '../../src/models/payment.model';
import {
  WalletTransactionTypes,
  PassengerWalletTransactionTypes,
  LedgerEntryTypes,
  PaymentMethods,
  PaymentStatuses,
} from '../../src/common/constants/roles.constant';

describe('Financial Models Schema & Validation Unit Test', () => {
  it('should validate double-entry WalletTransaction document', () => {
    const tx = new WalletTransaction({
      driver_id: new mongoose.Types.ObjectId(),
      trip_id: new mongoose.Types.ObjectId(),
      transaction_type: WalletTransactionTypes.COMMISSION_DEDUCT,
      entry_type: LedgerEntryTypes.DEBIT,
      amount: mongoose.Types.Decimal128.fromString('25.00'),
      balance_before: mongoose.Types.Decimal128.fromString('100.00'),
      balance_after: mongoose.Types.Decimal128.fromString('75.00'),
      notes: '10% Platform fee for trip TRX-1234',
    });

    const error = tx.validateSync();
    expect(error).toBeUndefined();
    expect(tx.status).toBe('settled');
    expect(tx.entry_type).toBe(LedgerEntryTypes.DEBIT);
  });

  it('should reject WalletTransaction with negative or zero amount', () => {
    const tx = new WalletTransaction({
      driver_id: new mongoose.Types.ObjectId(),
      transaction_type: WalletTransactionTypes.TOPUP,
      entry_type: LedgerEntryTypes.CREDIT,
      amount: mongoose.Types.Decimal128.fromString('0.00'),
      balance_before: mongoose.Types.Decimal128.fromString('50.00'),
      balance_after: mongoose.Types.Decimal128.fromString('50.00'),
      notes: 'Invalid zero topup',
    });

    const error = tx.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['amount']).toBeDefined();
    expect(error?.errors['amount'].message).toContain('Transaction amount must be positive');
  });

  it('should validate PassengerWalletTransaction document', () => {
    const ptx = new PassengerWalletTransaction({
      user_id: new mongoose.Types.ObjectId(),
      trip_id: new mongoose.Types.ObjectId(),
      transaction_type: PassengerWalletTransactionTypes.CASH_CHANGE_CREDIT,
      amount: mongoose.Types.Decimal128.fromString('15.00'),
      balance_before: mongoose.Types.Decimal128.fromString('0.00'),
      balance_after: mongoose.Types.Decimal128.fromString('15.00'),
      description: 'Change shortage credited by driver for trip TRX-1234',
    });

    const error = ptx.validateSync();
    expect(error).toBeUndefined();
    expect(ptx.transaction_type).toBe(PassengerWalletTransactionTypes.CASH_CHANGE_CREDIT);
  });

  it('should validate Payment document', () => {
    const payment = new Payment({
      trip_id: new mongoose.Types.ObjectId(),
      payer_user_id: new mongoose.Types.ObjectId(),
      payment_method: PaymentMethods.BKASH,
      gross_amount: mongoose.Types.Decimal128.fromString('200.00'),
      wallet_discount_applied: mongoose.Types.Decimal128.fromString('20.00'),
      net_amount_charged: mongoose.Types.Decimal128.fromString('180.00'),
      status: PaymentStatuses.PENDING,
      external_transaction_id: 'TRX_BKASH_998877',
    });

    const error = payment.validateSync();
    expect(error).toBeUndefined();
    expect(payment.status).toBe(PaymentStatuses.PENDING);
  });
});

