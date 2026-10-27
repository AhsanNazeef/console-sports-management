import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { ShellComponent } from '../../common/components/shell/shell.component';
import { ApiListResponse } from '../../common/models/api.model';
import { SearchService } from '../../common/services/search.service';
import { ViewportService } from '../../common/services/viewport.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { PageTitleService } from '../../core/page-title.service';
import { DEFAULT_TRANSACTION_QUERY } from '../constants/payments.constants';
import { PaymentStatus, PaymentSummary, Transaction, TransactionQuery } from '../models/payment.model';
import { PaymentsApiService } from '../services/payments-api.service';
import { summary, transaction } from '../testing/payment.fixtures';
import { PaymentListPage } from './payment-list.component';

const page = (rows: Transaction[], total: number): ApiListResponse<Transaction> => ({
  success: true,
  data: rows,
  meta: { page: 1, limit: 10, total, totalPages: Math.max(1, Math.ceil(total / 10)) },
});

const settle = async (harness: RouterTestingHarness, ms = 0): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await harness.fixture.whenStable();
};

describe('PaymentListPage', () => {
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let rows: Transaction[];
  let total: number;
  let api: {
    getSummary$: ReturnType<typeof vi.fn<() => Observable<PaymentSummary>>>;
    getTransactions$: ReturnType<typeof vi.fn<(query: TransactionQuery) => Observable<ApiListResponse<Transaction>>>>;
    getTransaction$: ReturnType<typeof vi.fn<(id: string) => Observable<Transaction>>>;
    changeStatus$: ReturnType<typeof vi.fn<(id: string, status: PaymentStatus) => Observable<void>>>;
  };

  // configure runs before the page loads, to change what the backend answers.
  async function setUp(url = '/payments', role = 'ADMIN', configure?: () => void): Promise<void> {
    rows = [transaction('1', 'PENDING'), transaction('2', 'COMPLETED')];
    total = 23;
    let pendingUsd = 4;
    api = {
      getSummary$: vi.fn(() => of(summary(pendingUsd))),
      getTransactions$: vi.fn(() => of(page([...rows], total))),
      // The detail endpoint's copy is newer than the row's.
      getTransaction$: vi.fn((id: string) =>
        of({ ...rows.find((row) => row.id === id)!, description: 'Season ticket' })
      ),
      // The backend applies the change; the next loads show it.
      changeStatus$: vi.fn((id: string, status: PaymentStatus) => {
        rows = rows.map((row) => (row.id === id ? { ...row, status } : row));
        pendingUsd -= 1;
        return of(undefined);
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'payments', component: PaymentListPage }]),
        { provide: PaymentsApiService, useValue: api },
        { provide: AuthService, useValue: { hasAnyRole: (roles: readonly string[]) => roles.includes(role) } },
      ],
    });
    configure?.();
    harness = await RouterTestingHarness.create(url);
    await settle(harness);
    element = harness.routeNativeElement as HTMLElement;
  }

  const lastQuery = (): TransactionQuery => api.getTransactions$.mock.lastCall![0];
  const url = (): string => TestBed.inject(Router).url;
  const select = (id: string): HTMLSelectElement => element.querySelector(`#${id}`) as HTMLSelectElement;
  const choose = async (id: string, value: string): Promise<void> => {
    select(id).value = value;
    select(id).dispatchEvent(new Event('change'));
    await settle(harness);
  };
  const buttonWithText = (text: string, root: ParentNode = element): HTMLButtonElement =>
    Array.from(root.querySelectorAll('button')).find((button) => button.textContent?.trim() === text)!;
  const popup = (): HTMLElement | null => element.querySelector('.transaction-detail');
  const confirmation = (): HTMLElement | null => element.querySelector('.dialog');
  const statusOfRow = (index: number): string =>
    element.querySelectorAll('tbody tr')[index].querySelector('app-status-tag')?.textContent?.trim() ?? '';
  const sortButton = (label: string): HTMLButtonElement | undefined =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.data-table__sort')).find((button) =>
      button.textContent?.includes(label)
    );
  // Each card's label, its lines (one total per currency) and its count.
  const cards = (): { label: string; lines: string[]; detail: string | null }[] =>
    Array.from(element.querySelectorAll('app-stat-card')).map((card) => ({
      label: card.querySelector('.stat-card__label')?.textContent?.trim() ?? '',
      lines: Array.from(card.querySelectorAll('.stat-card__line')).map((line) => line.textContent?.trim() ?? ''),
      detail: card.querySelector('.stat-card__detail')?.textContent?.trim() ?? null,
    }));
  const cardValues = (): string[] =>
    Array.from(element.querySelectorAll('.stat-card__value')).map((value) => value.textContent?.trim() ?? '');

  async function openTransaction(reference = 'TXN-1'): Promise<void> {
    const row = buttonWithText(reference);
    row.focus();
    row.click();
    await settle(harness);
  }

  async function askFor(status: PaymentStatus): Promise<void> {
    const newStatus = select('transaction-new-status');
    newStatus.value = status;
    newStatus.dispatchEvent(new Event('change'));
    harness.fixture.detectChanges();
    const ask = buttonWithText('Change Status', popup()!);
    ask.focus();
    ask.click();
    await settle(harness);
  }

  describe('summary', () => {
    it('shows the totals per currency as the backend formats them, never added together', async () => {
      await setUp();
      expect(cards()).toEqual([
        { label: 'Pending', lines: ['€16.32', '£74.80', '$272.98'], detail: '8 payments' },
        { label: 'Completed', lines: ['€60.18', '£60.47', '$15,217.52'], detail: '163 payments' },
        { label: 'Failed', lines: ['€157.89', '£30.94', '$287.57'], detail: '8 payments' },
        { label: 'Refunded', lines: ['€104.04', '£220.71', '$45.56'], detail: '7 payments' },
        { label: 'Gross Revenue', lines: ['€60.18', '£60.47', '$15,217.52'], detail: null },
      ]);
      expect(element.querySelector('.payment-list__stats')?.textContent).not.toContain('$15,338.17');
    });

    it('shows only the chosen currency’s totals and counts', async () => {
      await setUp();
      await choose('payment-currency-filter', 'EUR');
      expect(cards()[0]).toEqual({ label: 'Pending', lines: ['€16.32'], detail: '2 payments' });
      expect(cards()[4]).toEqual({ label: 'Gross Revenue', lines: ['€60.18'], detail: null });
    });

    it('offers the currencies the backend has totals for', async () => {
      await setUp();
      expect(Array.from(select('payment-currency-filter').options).map((option) => option.textContent?.trim())).toEqual(
        ['All currencies', 'EUR', 'GBP', 'USD']
      );
    });

    it('keeps a currency from the address that has no totals, and says so', async () => {
      await setUp('/payments?currency=XOF');
      expect(lastQuery().currency).toBe('XOF');
      expect(select('payment-currency-filter').value).toBe('XOF');
      expect(element.querySelector('.payment-list__note')?.textContent?.trim()).toBe('There are no totals for XOF.');
      expect(cardValues()).toEqual(['—', '—', '—', '—', '—']);
    });

    it('shows a status it doesn’t know as its own card', async () => {
      const chargeback = { status: 'CHARGEBACK' as PaymentStatus, count: 1, totalMinor: 500, total: '$5.00' };
      const withChargeback = summary();
      withChargeback.byStatus.push(chargeback);
      withChargeback.byCurrency[2].byStatus.push(chargeback);
      await setUp('/payments', 'ADMIN', () => api.getSummary$.mockReturnValue(of(withChargeback)));
      expect(cards()[4]).toEqual({ label: 'CHARGEBACK', lines: ['$5.00'], detail: '1 payment' });
      expect(cards()[5].label).toBe('Gross Revenue');
    });

    it('says when the totals fail to load, and loads them again on Try again', async () => {
      await setUp('/payments', 'ADMIN', () =>
        api.getSummary$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      );
      const banner = element.querySelector('.payment-list__error');
      expect(banner?.textContent).toContain("Couldn't load the totals.");
      expect(cardValues()).toEqual(['—', '—', '—', '—', '—']);

      buttonWithText('Try again', banner!).click();
      await settle(harness);
      expect(element.querySelector('.payment-list__error')).toBeNull();
      expect(cards()[0].detail).toBe('8 payments');
    });

    it('says why there are no currencies to choose yet', async () => {
      await setUp('/payments', 'ADMIN', () => api.getSummary$.mockReturnValue(NEVER));
      const hint = () => Array.from(select('payment-currency-filter').options).find((option) => option.disabled);
      expect(hint()?.textContent?.trim()).toBe('Loading currencies…');
    });

    it('says when the currencies couldn’t be loaded', async () => {
      await setUp('/payments', 'ADMIN', () =>
        api.getSummary$.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      );
      const hint = Array.from(select('payment-currency-filter').options).find((option) => option.disabled);
      expect(hint?.textContent?.trim()).toBe("Couldn't load the currencies");
    });

    it('shows dashes, not old totals, when loading them again fails', async () => {
      await setUp();
      api.getSummary$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
      await openTransaction();
      await askFor('COMPLETED');
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(element.querySelector('.payment-list__error')?.textContent).toContain("Couldn't load the totals.");
      expect(cardValues()).toEqual(['—', '—', '—', '—', '—']);
    });
  });

  describe('transactions', () => {
    it('lists the transactions with their method, amount and status', async () => {
      await setUp();
      expect(lastQuery()).toEqual(DEFAULT_TRANSACTION_QUERY);
      const cells = Array.from(element.querySelectorAll('tbody tr')[0].querySelectorAll('td')).map((cell) =>
        cell.textContent?.trim()
      );
      expect(cells.slice(0, 6)).toEqual([
        'TXN-1',
        'fan1017@buzzer.dev',
        'Match ticket',
        'Apple Pay',
        '$99.42',
        'Pending',
      ]);
    });

    it('filters by status and currency on the server and keeps them in the address', async () => {
      await setUp();
      await choose('payment-status-filter', 'FAILED');
      await choose('payment-currency-filter', 'EUR');
      expect(lastQuery()).toMatchObject({ status: 'FAILED', currency: 'EUR', page: 1 });
      expect(url()).toBe('/payments?status=FAILED&currency=EUR');

      buttonWithText('Next').click();
      await settle(harness);
      expect(url()).toBe('/payments?status=FAILED&currency=EUR&page=2');
    });

    it('goes back to page 1 when a filter or the order changes', async () => {
      await setUp('/payments?page=3');
      expect(lastQuery().page).toBe(3);
      await choose('payment-status-filter', 'PENDING');
      expect(lastQuery()).toMatchObject({ status: 'PENDING', page: 1 });

      buttonWithText('Next').click();
      await settle(harness);
      sortButton('Date')!.click();
      await settle(harness);
      expect(lastQuery()).toMatchObject({ sortBy: 'createdAt', sortOrder: 'asc', page: 1 });
    });

    it('goes back to page 1 when the currency, the search or another column changes', async () => {
      await setUp('/payments?page=3');
      await choose('payment-currency-filter', 'EUR');
      expect(lastQuery()).toMatchObject({ currency: 'EUR', page: 1 });

      await harness.navigateByUrl('/payments?currency=EUR&page=3');
      await settle(harness);
      sortButton('Amount')!.click();
      await settle(harness);
      expect(lastQuery()).toMatchObject({ sortBy: 'amount', sortOrder: 'desc', page: 1 });

      await harness.navigateByUrl('/payments?page=3');
      await settle(harness);
      TestBed.inject(SearchService).setQuery('card');
      await settle(harness, 350);
      expect(lastQuery()).toMatchObject({ search: 'card', page: 1 });
      expect(url()).toBe('/payments?search=card');
    });

    it('searches from the header search box and keeps the search in the address', async () => {
      await setUp();
      TestBed.inject(SearchService).setQuery('paypal');
      await settle(harness, 350);
      expect(lastQuery()).toMatchObject({ search: 'paypal', page: 1 });
      expect(url()).toBe('/payments?search=paypal');
    });

    it('starts from the address after a reload, selects and search box included', async () => {
      await setUp('/payments?status=REFUNDED&currency=GBP&search=card&page=2&sortBy=amount&sortOrder=asc');
      expect(api.getTransactions$.mock.calls[0][0]).toEqual({
        ...DEFAULT_TRANSACTION_QUERY,
        status: 'REFUNDED',
        currency: 'GBP',
        search: 'card',
        page: 2,
        sortBy: 'amount',
        sortOrder: 'asc',
      });
      expect(select('payment-status-filter').value).toBe('REFUNDED');
      expect(select('payment-currency-filter').value).toBe('GBP');
      expect(await firstValueFrom(TestBed.inject(SearchService).query$)).toBe('card');

      await settle(harness, 350);
      expect(lastQuery()).toMatchObject({ search: 'card', page: 2 });
      expect(url()).toBe('/payments?status=REFUNDED&currency=GBP&search=card&page=2&sortBy=amount&sortOrder=asc');
    });

    it('follows the address when it changes on the same page, such as the sidebar link', async () => {
      await setUp('/payments?status=FAILED&search=foo&page=2');
      await harness.navigateByUrl('/payments');
      await settle(harness, 350);
      expect(lastQuery()).toEqual(DEFAULT_TRANSACTION_QUERY);
      expect(select('payment-status-filter').value).toBe('');
      expect(await firstValueFrom(TestBed.inject(SearchService).query$)).toBe('');
      expect(url()).toBe('/payments');
    });

    it('sorts by amount only within one currency', async () => {
      await setUp();
      expect(sortButton('Amount')).toBeUndefined();

      await choose('payment-currency-filter', 'EUR');
      sortButton('Amount')!.click();
      await settle(harness);
      expect(lastQuery()).toMatchObject({ currency: 'EUR', sortBy: 'amount', sortOrder: 'desc' });
      sortButton('Amount')!.click();
      await settle(harness);
      expect(lastQuery()).toMatchObject({ sortBy: 'amount', sortOrder: 'asc' });

      await choose('payment-currency-filter', '');
      expect(lastQuery()).toMatchObject({ currency: '', sortBy: 'createdAt', sortOrder: 'desc' });
      expect(api.getTransactions$.mock.calls.some(([query]) => !query.currency && query.sortBy === 'amount')).toBe(
        false
      );
    });

    it('says there are no transactions yet, or none for these filters', async () => {
      await setUp();
      rows = [];
      total = 0;
      await choose('payment-status-filter', 'FAILED');
      expect(element.querySelector('.data-table__empty')?.textContent?.trim()).toBe(
        'No transactions match these filters.'
      );
      expect(element.querySelector('app-pagination')).toBeNull();

      await choose('payment-status-filter', '');
      expect(element.querySelector('.data-table__empty')?.textContent?.trim()).toBe('No transactions yet.');
    });

    it('shows one message when the transactions fail to load, and loads them again on Try again', async () => {
      await setUp();
      api.getTransactions$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
      await choose('payment-status-filter', 'PENDING');
      expect(element.querySelectorAll('[role="alert"]').length).toBe(1);
      expect(element.querySelector('.payment-list__error')?.textContent).toContain("Couldn't load the transactions.");
      expect(element.querySelector('app-data-table')).toBeNull();

      buttonWithText('Try again').click();
      await settle(harness);
      expect(element.querySelector('.payment-list__error')).toBeNull();
      expect(statusOfRow(0)).toBe('Pending');
    });

    it('shows a status it doesn’t know as the backend sent it', async () => {
      await setUp('/payments', 'ADMIN', () => (rows = [transaction('3', 'CHARGEBACK' as PaymentStatus)]));
      const tag = element.querySelector('tbody tr app-status-tag span');
      expect(tag?.textContent?.trim()).toBe('CHARGEBACK');
      expect(tag?.className).toContain('status-tag--neutral');

      await openTransaction('TXN-3');
      expect(element.querySelector('.modal__title')?.textContent).toBe('TXN-3');
      expect(element.querySelector('#transaction-new-status')).toBeNull();
      expect(popup()?.textContent).toContain("This status isn't one the console knows");
    });
  });

  describe('transaction popup and status change', () => {
    it('opens a transaction and shows the copy from its detail endpoint', async () => {
      await setUp();
      await openTransaction();
      expect(api.getTransaction$).toHaveBeenCalledWith('1');
      expect(element.querySelector('.modal__title')?.textContent).toBe('TXN-1');
      expect(popup()?.textContent).toContain('Season ticket');
    });

    it('says when the latest copy can’t be loaded, or the transaction is gone', async () => {
      await setUp();
      api.getTransaction$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
      await openTransaction();
      expect(popup()?.textContent).toContain("Couldn't load the latest copy of this transaction.");
      expect(popup()?.textContent).toContain('Match ticket');

      buttonWithText('Close', popup()!).click();
      await settle(harness);
      api.getTransaction$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
      await openTransaction();
      expect(popup()?.textContent).toContain('This transaction no longer exists.');
      expect(element.querySelector('#transaction-new-status')).toBeNull();
      expect(api.getTransactions$).toHaveBeenCalledTimes(2);
    });

    it('changes a status after an explicit confirmation, then reads the transaction again', async () => {
      await setUp();
      await openTransaction();
      await askFor('COMPLETED');
      expect(confirmation()?.textContent).toContain('Change TXN-1 from Pending to Completed?');
      expect(confirmation()?.textContent).toContain(
        'This only updates the payment’s status, for the whole team. No money is refunded or charged.'
      );
      expect(api.changeStatus$).not.toHaveBeenCalled();

      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(api.changeStatus$).toHaveBeenCalledWith('1', 'COMPLETED');
      expect(confirmation()).toBeNull();
      expect(api.getTransaction$).toHaveBeenCalledTimes(2);
      expect(popup()?.querySelector('app-status-tag')?.textContent?.trim()).toBe('Completed');
      expect(statusOfRow(0)).toBe('Completed');
      expect(cards()[0].detail).toBe('7 payments');
    });

    it('sends nothing when the confirmation is left with Go back or Escape', async () => {
      await setUp();
      await openTransaction();
      await askFor('FAILED');
      buttonWithText('Go back', confirmation()!).click();
      await settle(harness);
      expect(confirmation()).toBeNull();
      expect(element.querySelector('.modal__title')?.textContent).toBe('TXN-1');

      await askFor('FAILED');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle(harness);
      expect(confirmation()).toBeNull();
      expect(popup()).not.toBeNull();

      expect(api.changeStatus$).not.toHaveBeenCalled();
      expect(api.getTransactions$).toHaveBeenCalledTimes(1);
      expect(api.getSummary$).toHaveBeenCalledTimes(1);
    });

    it('keeps keyboard focus in the confirmation and gives it back afterwards', async () => {
      await setUp();
      await openTransaction();
      await askFor('FAILED');
      expect(confirmation()?.contains(document.activeElement)).toBe(true);
      for (let i = 0; i < 3; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
      }
      expect(confirmation()?.contains(document.activeElement)).toBe(true);

      buttonWithText('Go back', confirmation()!).click();
      await settle(harness);
      expect(document.activeElement).toBe(buttonWithText('Change Status', popup()!));

      buttonWithText('Close', popup()!).click();
      await settle(harness);
      expect(document.activeElement).toBe(buttonWithText('TXN-1'));
    });

    it('shows why a status change failed', async () => {
      await setUp();
      api.changeStatus$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
      await openTransaction();
      await askFor('FAILED');
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(element.querySelector('.payment-list__dialog-error')?.textContent).toBe(
        "Your role isn't allowed to make this change."
      );

      api.changeStatus$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(element.querySelector('.payment-list__dialog-error')?.textContent).toBe(
        "Couldn't change the status. Please try again."
      );
    });

    it('closes the confirmation when the transaction is gone', async () => {
      await setUp();
      api.changeStatus$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
      await openTransaction();
      await askFor('COMPLETED');
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(confirmation()).toBeNull();
      expect(popup()?.textContent).toContain('This transaction no longer exists.');
      expect(element.querySelector('#transaction-new-status')).toBeNull();
      expect(api.getTransactions$).toHaveBeenCalledTimes(2);
      expect(api.getSummary$).toHaveBeenCalledTimes(2);
      expect(element.querySelector('.modal')?.contains(document.activeElement)).toBe(true);
    });

    it('waits for the new copy after a change, then puts focus back in the popup', async () => {
      await setUp();
      await openTransaction();
      const newCopy = new Subject<Transaction>();
      api.getTransaction$.mockReturnValueOnce(newCopy);
      await askFor('COMPLETED');
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(popup()?.textContent).toContain('Updating…');
      expect(element.querySelector('#transaction-new-status')).toBeNull();
      expect(element.querySelector('.modal')?.contains(document.activeElement)).toBe(true);

      newCopy.next({ ...rows[0] });
      await settle(harness);
      expect(popup()?.querySelector('app-status-tag')?.textContent?.trim()).toBe('Completed');
      expect(element.querySelector('.modal')?.contains(document.activeElement)).toBe(true);
    });

    it('offers no change when the new copy can’t be loaded after a change', async () => {
      await setUp();
      await openTransaction();
      api.getTransaction$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
      await askFor('COMPLETED');
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(popup()?.textContent).toContain("The status was changed, but the new copy couldn't be loaded.");
      expect(element.querySelector('#transaction-new-status')).toBeNull();
    });

    it('drops a pending confirmation that the newer copy no longer allows', async () => {
      await setUp();
      const newerCopy = new Subject<Transaction>();
      api.getTransaction$.mockReturnValueOnce(newerCopy);
      await openTransaction();
      await askFor('FAILED');
      expect(confirmation()).not.toBeNull();

      newerCopy.next({ ...rows[0], status: 'COMPLETED' });
      await settle(harness);
      expect(confirmation()).toBeNull();
      expect(popup()?.textContent).toContain('This transaction changed meanwhile.');
      expect(api.changeStatus$).not.toHaveBeenCalled();
    });

    it('ignores a late copy of a transaction that was closed', async () => {
      await setUp();
      const lateCopy = new Subject<Transaction>();
      api.getTransaction$.mockReturnValueOnce(lateCopy);
      await openTransaction();
      buttonWithText('Close', popup()!).click();
      await settle(harness);
      lateCopy.next({ ...rows[0] });
      await settle(harness);
      expect(popup()).toBeNull();
    });

    it('keeps the pending change on its transaction while another row is clicked', async () => {
      await setUp();
      await openTransaction();
      await askFor('FAILED');
      buttonWithText('TXN-2').click();
      await settle(harness);
      expect(confirmation()?.textContent).toContain('Change TXN-1 from Pending to Failed?');
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      expect(api.changeStatus$).toHaveBeenCalledWith('1', 'FAILED');
    });

    it('lets Escape close the popup again once the confirmation is gone', async () => {
      await setUp();
      await openTransaction();
      await askFor('FAILED');
      buttonWithText('Go back', confirmation()!).click();
      await settle(harness);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle(harness);
      expect(popup()).toBeNull();
    });

    it('stays open while a change is being saved', async () => {
      await setUp();
      const saving = new Subject<void>();
      api.changeStatus$.mockReturnValueOnce(saving);
      await openTransaction();
      await askFor('FAILED');
      buttonWithText('Change Status', confirmation()!).click();
      await settle(harness);
      (element.querySelector('.modal__close') as HTMLButtonElement).click();
      await settle(harness);
      expect(popup()).not.toBeNull();
      expect(confirmation()).not.toBeNull();
    });

    for (const [role, allowed] of [
      ['ADMIN', true],
      ['OPERATOR', true],
      ['VIEWER', false],
      ['ORG', false],
    ] as const) {
      it(`${allowed ? 'offers' : 'offers no'} status change to ${role}`, async () => {
        await setUp('/payments', role);
        await openTransaction();
        expect(!!element.querySelector('#transaction-new-status')).toBe(allowed);
      });
    }
  });
});

@Component({ template: 'next page' })
class NextPage {}

describe('PaymentListPage in the console layout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: ShellComponent,
            children: [
              { path: 'payments', component: PaymentListPage },
              {
                path: 'sports',
                loadComponent: () => new Promise<Type<unknown>>((resolve) => setTimeout(() => resolve(NextPage), 600)),
              },
            ],
          },
        ]),
        { provide: TitleStrategy, useExisting: PageTitleService },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 'u1', email: 'admin@buzzer.dev', role: 'ADMIN' }),
            signOut: vi.fn(),
            hasAnyRole: () => true,
          },
        },
        { provide: ViewportService, useValue: { isPhone$: of(false), isTablet$: of(false) } },
        {
          provide: PaymentsApiService,
          useValue: {
            getSummary$: () => of(summary()),
            getTransactions$: () => of(page([transaction('1')], 1)),
            getTransaction$: vi.fn(),
            changeStatus$: vi.fn(),
          },
        },
      ],
    });
  });

  // Leaving Payments with a search, for a page whose code is still downloading, used to be cancelled.
  it('reaches the next page when leaving with a search', async () => {
    const harness = await RouterTestingHarness.create('/payments?search=foo');
    await settle(harness, 400);
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/sports');
    await settle(harness, 1000);
    expect(await navigation).toBe(true);
    expect(router.url).toBe('/sports');
    expect(await firstValueFrom(TestBed.inject(SearchService).query$)).toBe('');
  });

  it('reaches the next page when a search is typed just before leaving', async () => {
    const harness = await RouterTestingHarness.create('/payments');
    await settle(harness, 400);
    TestBed.inject(SearchService).setQuery('card');
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/sports');
    await settle(harness, 1000);
    expect(await navigation).toBe(true);
    expect(router.url).toBe('/sports');
  });
});
