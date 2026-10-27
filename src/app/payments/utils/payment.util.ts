import { ParamMap, Params } from '@angular/router';
import { StatusTone } from '../../common/components/status-tag/status-tag.component';
import {
  CURRENCY_CODE,
  DEFAULT_TRANSACTION_QUERY,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  PAYMENT_STATUS_TRANSITIONS,
  PAYMENT_STATUSES,
} from '../constants/payments.constants';
import { PaymentStatus, PaymentSummary, TransactionQuery, TransactionSortField } from '../models/payment.model';

const SORT_FIELDS: readonly TransactionSortField[] = ['createdAt', 'amount'];

// The page's filters, search, page and order as they appear in the address (?status=PENDING&page=2),
// leaving out anything at its default so the address stays short.
export function toQueryParams(query: TransactionQuery): Params {
  const params: Params = {};
  const defaults = DEFAULT_TRANSACTION_QUERY;
  if (query.status) params['status'] = query.status;
  if (query.currency) params['currency'] = query.currency;
  if (query.search) params['search'] = query.search;
  if (query.page !== defaults.page) params['page'] = query.page;
  if (query.sortBy !== defaults.sortBy) params['sortBy'] = query.sortBy;
  if (query.sortOrder !== defaults.sortOrder) params['sortOrder'] = query.sortOrder;
  return params;
}

// The query back from the address after a reload. Unknown or broken values fall back to the defaults, and Amount
// sorts only within one currency.
export function fromQueryParams(params: ParamMap): TransactionQuery {
  const defaults = DEFAULT_TRANSACTION_QUERY;
  const status = params.get('status') ?? '';
  const currency = params.get('currency') ?? '';
  const page = Number(params.get('page'));
  const sortBy = params.get('sortBy') as TransactionSortField;
  const sortOrder = params.get('sortOrder');
  const query: TransactionQuery = {
    ...defaults,
    status: isPaymentStatus(status) ? status : '',
    currency: CURRENCY_CODE.test(currency) ? currency : '',
    search: params.get('search')?.trim() ?? '',
    page: Number.isSafeInteger(page) && page > 0 ? page : defaults.page,
    sortBy: SORT_FIELDS.includes(sortBy) ? sortBy : defaults.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : defaults.sortOrder,
  };
  return query.sortBy === 'amount' && !query.currency
    ? { ...query, sortBy: defaults.sortBy, sortOrder: defaults.sortOrder }
    : query;
}

// Same filters, search, page and order.
export function sameQuery(a: TransactionQuery, b: TransactionQuery): boolean {
  return JSON.stringify(toQueryParams(a)) === JSON.stringify(toQueryParams(b));
}

export function isPaymentStatus(status: string): status is PaymentStatus {
  return PAYMENT_STATUSES.includes(status as PaymentStatus);
}

// A status the console doesn't know is shown as the backend sent it, in the neutral colour.
export function paymentStatusLabel(status: string): string {
  return isPaymentStatus(status) ? PAYMENT_STATUS_LABELS[status] : status;
}

export function paymentStatusTone(status: string): StatusTone {
  return isPaymentStatus(status) ? PAYMENT_STATUS_TONES[status] : 'neutral';
}

// The statuses a payment may move to from this one; none from a status the console doesn't know.
export function nextPaymentStatuses(status: string): readonly PaymentStatus[] {
  return isPaymentStatus(status) ? PAYMENT_STATUS_TRANSITIONS[status] : [];
}

// "apple_pay" → "Apple Pay"
export function paymentMethodLabel(method: string | null): string {
  if (!method) {
    return '—';
  }
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ');
}

// The backend searches the method's code ("apple_pay"), so a method typed as the table shows it ("Apple Pay") is
// sent as its code. Everything else goes as typed.
export function searchTermForBackend(search: string): string {
  const typed = search.trim().toLowerCase();
  const method = Object.entries(PAYMENT_METHOD_LABELS).find(([, label]) => label.toLowerCase() === typed);
  return method ? method[0] : search;
}

export interface PaymentSummaryCard {
  label: string;
  // One formatted total per currency, as the backend sends them; null shows a dash.
  value: readonly string[] | null;
  detail: string | null;
}

// The summary cards: one per status (the four known ones, then any other the backend reports) and gross revenue.
// Totals come per currency, never added across currencies; with a currency filter only that currency's totals show.
export function paymentSummaryCards(summary: PaymentSummary | null, currency: string): PaymentSummaryCard[] {
  const currencies = summary ? summary.byCurrency.filter((entry) => !currency || entry.currency === currency) : [];
  const counted = currency ? currencies.flatMap((entry) => entry.byStatus) : (summary?.byStatus ?? []);
  const reported = [...(summary?.byStatus ?? []), ...currencies.flatMap((entry) => entry.byStatus)].map(
    (entry) => entry.status as string
  );
  const statuses = [...new Set<string>([...PAYMENT_STATUSES, ...reported])];

  const cards = statuses.map((status): PaymentSummaryCard => {
    const totals = currencies.flatMap((entry) => entry.byStatus.filter((total) => total.status === status));
    const counts = counted.filter((total) => total.status === status);
    const count = counts.reduce((sum, total) => sum + total.count, 0);
    const noun = count === 1 ? 'payment' : 'payments';
    return {
      label: paymentStatusLabel(status),
      value: summary && totals.length ? totals.map((total) => total.total) : null,
      detail: summary && counts.length ? `${count} ${noun}` : null,
    };
  });
  const gross = currencies.map((entry) => entry.grossRevenue);
  return [...cards, { label: 'Gross Revenue', value: gross.length ? gross : null, detail: null }];
}
