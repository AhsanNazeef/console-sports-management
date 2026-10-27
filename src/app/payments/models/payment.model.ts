import { SortOrder } from '../../common/models/api.model';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Transaction {
  id: string;
  reference: string;
  // In minor units (cents); amountFormatted is what the console shows.
  amount: number;
  amountFormatted: string;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  description: string | null;
  customer: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStatusTotal {
  status: PaymentStatus;
  count: number;
  totalMinor: number;
  // Formatted by the backend ("$364.10"); shown as it is, never recalculated.
  total: string;
}

// One currency's totals.
export interface CurrencySummary {
  currency: string;
  byStatus: PaymentStatusTotal[];
  grossRevenue: string;
  grossRevenueMinor: number;
}

// GET /payments/summary. The top-level totals add every currency's minor units together under one symbol, so the
// console shows the totals per currency (byCurrency) and takes only the counts from the top level.
export interface PaymentSummary {
  byStatus: PaymentStatusTotal[];
  grossRevenue: string;
  grossRevenueMinor: number;
  byCurrency: CurrencySummary[];
}

export type TransactionSortField = 'createdAt' | 'amount';

// '' means no filter.
export interface TransactionQuery {
  status: PaymentStatus | '';
  currency: string;
  search: string;
  page: number;
  limit: number;
  sortBy: TransactionSortField;
  sortOrder: SortOrder;
}
