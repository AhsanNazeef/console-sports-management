import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEFAULT_TRANSACTION_QUERY } from '../constants/payments.constants';
import { PaymentsApiService } from './payments-api.service';

const BASE = `${environment.apiBaseUrl}/payments`;
const EMPTY_PAGE = { success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };

describe('PaymentsApiService', () => {
  let api: PaymentsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PaymentsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the summary', async () => {
    const summary = firstValueFrom(api.getSummary$());
    http
      .expectOne(`${BASE}/summary`)
      .flush({ success: true, data: { byStatus: [], grossRevenue: '$0.00', grossRevenueMinor: 0, byCurrency: [] } });
    expect((await summary).byCurrency).toEqual([]);
  });

  it('lists transactions with the filters, search, paging and order on the server', () => {
    api
      .getTransactions$({
        ...DEFAULT_TRANSACTION_QUERY,
        status: 'FAILED',
        currency: 'EUR',
        search: 'ticket',
        page: 2,
        sortBy: 'amount',
      })
      .subscribe();
    const request = http.expectOne((req) => req.url === `${BASE}/transactions`);
    const params = request.request.params;
    expect([params.get('status'), params.get('currency'), params.get('search')]).toEqual(['FAILED', 'EUR', 'ticket']);
    expect([params.get('page'), params.get('limit'), params.get('sortBy'), params.get('sortOrder')]).toEqual([
      '2',
      '10',
      'amount',
      'desc',
    ]);
    request.flush(EMPTY_PAGE);
  });

  it('searches a method by its code when it is typed as the table shows it', () => {
    api.getTransactions$({ ...DEFAULT_TRANSACTION_QUERY, search: 'Apple Pay' }).subscribe();
    const request = http.expectOne((req) => req.url === `${BASE}/transactions`);
    expect(request.request.params.get('search')).toBe('apple_pay');
    request.flush(EMPTY_PAGE);
  });

  it('sends no empty filters', () => {
    api.getTransactions$(DEFAULT_TRANSACTION_QUERY).subscribe();
    const request = http.expectOne((req) => req.url === `${BASE}/transactions`);
    expect(['status', 'currency', 'search'].map((name) => request.request.params.has(name))).toEqual([
      false,
      false,
      false,
    ]);
    request.flush(EMPTY_PAGE);
  });

  it('reads a transaction and changes its status', () => {
    api.getTransaction$('x1').subscribe();
    http.expectOne(`${BASE}/transactions/x1`).flush({ success: true, data: { id: 'x1' } });

    api.changeStatus$('x1', 'REFUNDED').subscribe();
    const patch = http.expectOne(`${BASE}/transactions/x1/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'REFUNDED' });
    patch.flush({ success: true, data: { id: 'x1', status: 'REFUNDED' } });
  });

  it('doesn’t rely on the body of the status change response', async () => {
    const done = firstValueFrom(api.changeStatus$('x1', 'COMPLETED'));
    http.expectOne(`${BASE}/transactions/x1/status`).flush(null);
    expect(await done).toBeUndefined();
  });
});
