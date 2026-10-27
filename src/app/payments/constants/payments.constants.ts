import { StatusTone } from '../../common/components/status-tag/status-tag.component';
import { PaymentStatus, TransactionQuery } from '../models/payment.model';

export const PAYMENTS_PAGE_SIZE = 10;

// Newest first.
export const DEFAULT_TRANSACTION_QUERY: TransactionQuery = {
  status: '',
  currency: '',
  search: '',
  page: 1,
  limit: PAYMENTS_PAGE_SIZE,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

// In the order the summary cards show them.
export const PAYMENT_STATUSES: readonly PaymentStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  PENDING: 'yellow',
  COMPLETED: 'green',
  FAILED: 'red',
  REFUNDED: 'orange',
};

// The moves the console offers: the usual payment lifecycle. The backend accepts any status (it has no transition rules
// for payments), so the console keeps to these.
export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['COMPLETED', 'FAILED'],
  COMPLETED: ['REFUNDED'],
  FAILED: [],
  REFUNDED: [],
};

// Currencies come from the summary's byCurrency; an address may carry any three-letter code (the filter matches it
// exactly, so it must be upper case).
export const CURRENCY_CODE = /^[A-Z]{3}$/;

// How the backend's payment method codes read in the console; unknown codes are shown with spaces.
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  paypal: 'PayPal',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

// Roles the backend lets change a payment's status. VIEWER and ORG get 403.
export const PAYMENT_STATUS_EDITOR_ROLES = ['ADMIN', 'OPERATOR'] as const;
