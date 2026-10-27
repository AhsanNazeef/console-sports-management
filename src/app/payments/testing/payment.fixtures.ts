import { PaymentStatus, PaymentStatusTotal, PaymentSummary, Transaction } from '../models/payment.model';

// Test data shared by the payments specs.
export function transaction(
  id: string,
  status: PaymentStatus = 'PENDING',
  changes: Partial<Transaction> = {}
): Transaction {
  return {
    id,
    reference: `TXN-${id}`,
    amount: 9942,
    amountFormatted: '$99.42',
    currency: 'USD',
    status,
    method: 'apple_pay',
    description: 'Match ticket',
    customer: 'fan1017@buzzer.dev',
    createdAt: '2026-08-07T14:00:00.000Z',
    updatedAt: '2026-08-07T14:00:00.000Z',
    ...changes,
  };
}

const total = (status: PaymentStatus, count: number, totalMinor: number, formatted: string): PaymentStatusTotal => ({
  status,
  count,
  totalMinor,
  total: formatted,
});

// GET /payments/summary as the backend sent it on 27 Oct 2026, in its own order. The top-level totals add the three
// currencies together under "$"; the console must not show them. pendingUsd moves the USD pending count.
export function summary(pendingUsd = 4): PaymentSummary {
  return {
    byStatus: [
      total('REFUNDED', 7, 37031, '$370.31'),
      total('FAILED', 8, 47640, '$476.40'),
      total('PENDING', 4 + pendingUsd, 36410, '$364.10'),
      total('COMPLETED', 163, 1533817, '$15,338.17'),
    ],
    grossRevenue: '$15,338.17',
    grossRevenueMinor: 1533817,
    byCurrency: [
      {
        currency: 'EUR',
        byStatus: [
          total('PENDING', 2, 1632, '€16.32'),
          total('COMPLETED', 2, 6018, '€60.18'),
          total('FAILED', 3, 15789, '€157.89'),
          total('REFUNDED', 2, 10404, '€104.04'),
        ],
        grossRevenue: '€60.18',
        grossRevenueMinor: 6018,
      },
      {
        currency: 'GBP',
        byStatus: [
          total('FAILED', 2, 3094, '£30.94'),
          total('COMPLETED', 1, 6047, '£60.47'),
          total('PENDING', 2, 7480, '£74.80'),
          total('REFUNDED', 3, 22071, '£220.71'),
        ],
        grossRevenue: '£60.47',
        grossRevenueMinor: 6047,
      },
      {
        currency: 'USD',
        byStatus: [
          total('REFUNDED', 2, 4556, '$45.56'),
          total('PENDING', pendingUsd, 27298, '$272.98'),
          total('FAILED', 3, 28757, '$287.57'),
          total('COMPLETED', 160, 1521752, '$15,217.52'),
        ],
        grossRevenue: '$15,217.52',
        grossRevenueMinor: 1521752,
      },
    ],
  };
}
