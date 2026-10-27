import { convertToParamMap } from '@angular/router';
import { DEFAULT_TRANSACTION_QUERY } from '../constants/payments.constants';
import { summary } from '../testing/payment.fixtures';
import {
  fromQueryParams,
  nextPaymentStatuses,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  paymentSummaryCards,
  sameQuery,
  searchTermForBackend,
  toQueryParams,
} from './payment.util';

describe('toQueryParams', () => {
  it('leaves the defaults out of the address', () => {
    expect(toQueryParams(DEFAULT_TRANSACTION_QUERY)).toEqual({});
  });

  it('puts the filters, search, page and order in the address', () => {
    expect(
      toQueryParams({
        ...DEFAULT_TRANSACTION_QUERY,
        status: 'PENDING',
        currency: 'EUR',
        search: 'paypal',
        page: 3,
        sortBy: 'amount',
        sortOrder: 'asc',
      })
    ).toEqual({ status: 'PENDING', currency: 'EUR', search: 'paypal', page: 3, sortBy: 'amount', sortOrder: 'asc' });
  });
});

describe('fromQueryParams', () => {
  it('reads the same query back after a reload', () => {
    const params = convertToParamMap({ status: 'REFUNDED', currency: 'GBP', search: ' card ', page: '2' });
    expect(fromQueryParams(params)).toEqual({
      ...DEFAULT_TRANSACTION_QUERY,
      status: 'REFUNDED',
      currency: 'GBP',
      search: 'card',
      page: 2,
    });
  });

  it('falls back to the defaults for values it does not know', () => {
    const params = convertToParamMap({
      status: 'LOST',
      currency: 'usd',
      page: '-1',
      sortBy: 'customer',
      sortOrder: 'up',
    });
    expect(fromQueryParams(params)).toEqual(DEFAULT_TRANSACTION_QUERY);
  });

  it('takes any upper-case currency code, which the filter matches exactly', () => {
    expect(fromQueryParams(convertToParamMap({ currency: 'XOF' })).currency).toBe('XOF');
    expect(fromQueryParams(convertToParamMap({ currency: 'EURO' })).currency).toBe('');
  });

  it('ignores a page number too large to be exact', () => {
    expect(fromQueryParams(convertToParamMap({ page: '1e20' })).page).toBe(1);
    expect(fromQueryParams(convertToParamMap({ page: '2.5' })).page).toBe(1);
  });

  it('sorts by amount only within one currency', () => {
    expect(fromQueryParams(convertToParamMap({ sortBy: 'amount', sortOrder: 'asc' }))).toEqual(
      DEFAULT_TRANSACTION_QUERY
    );
    expect(fromQueryParams(convertToParamMap({ currency: 'EUR', sortBy: 'amount' })).sortBy).toBe('amount');
  });
});

describe('sameQuery', () => {
  it('compares what the address would show', () => {
    expect(sameQuery(DEFAULT_TRANSACTION_QUERY, { ...DEFAULT_TRANSACTION_QUERY })).toBe(true);
    expect(sameQuery(DEFAULT_TRANSACTION_QUERY, { ...DEFAULT_TRANSACTION_QUERY, page: 2 })).toBe(false);
  });
});

describe('payment statuses', () => {
  it('names the known statuses and shows others as they are, in the neutral colour', () => {
    expect(paymentStatusLabel('REFUNDED')).toBe('Refunded');
    expect(paymentStatusTone('REFUNDED')).toBe('orange');
    expect(paymentStatusLabel('CHARGEBACK')).toBe('CHARGEBACK');
    expect(paymentStatusTone('CHARGEBACK')).toBe('neutral');
  });

  it('allows the usual lifecycle only', () => {
    expect(nextPaymentStatuses('PENDING')).toEqual(['COMPLETED', 'FAILED']);
    expect(nextPaymentStatuses('COMPLETED')).toEqual(['REFUNDED']);
    expect(nextPaymentStatuses('FAILED')).toEqual([]);
    expect(nextPaymentStatuses('REFUNDED')).toEqual([]);
    expect(nextPaymentStatuses('CHARGEBACK')).toEqual([]);
  });
});

describe('searchTermForBackend', () => {
  it('sends a method typed as the table shows it as its code', () => {
    expect(searchTermForBackend('Apple Pay')).toBe('apple_pay');
    expect(searchTermForBackend(' google pay ')).toBe('google_pay');
  });

  it('sends anything else as typed', () => {
    expect(searchTermForBackend('TXN-1017')).toBe('TXN-1017');
    expect(searchTermForBackend('apple')).toBe('apple');
  });
});

describe('paymentSummaryCards', () => {
  it('gives each card one total per currency and the overall count', () => {
    const cards = paymentSummaryCards(summary(), '');
    expect(cards.map((card) => card.label)).toEqual(['Pending', 'Completed', 'Failed', 'Refunded', 'Gross Revenue']);
    expect(cards[1]).toEqual({ label: 'Completed', value: ['€60.18', '£60.47', '$15,217.52'], detail: '163 payments' });
  });

  it('gives one currency’s totals and counts when filtered', () => {
    expect(paymentSummaryCards(summary(), 'GBP')[3]).toEqual({
      label: 'Refunded',
      value: ['£220.71'],
      detail: '3 payments',
    });
  });

  it('shows dashes while there is no summary, or none for the currency', () => {
    expect(paymentSummaryCards(null, '').every((card) => card.value === null && card.detail === null)).toBe(true);
    expect(paymentSummaryCards(summary(), 'XOF').every((card) => card.value === null)).toBe(true);
  });
});

describe('paymentMethodLabel', () => {
  it('names the methods the backend uses', () => {
    expect(paymentMethodLabel('apple_pay')).toBe('Apple Pay');
    expect(paymentMethodLabel('paypal')).toBe('PayPal');
  });

  it('shows other codes readably, and a dash when there is none', () => {
    expect(paymentMethodLabel('bank_transfer')).toBe('bank transfer');
    expect(paymentMethodLabel(null)).toBe('—');
  });
});
