import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, Subject, switchMap } from 'rxjs';
import { ButtonComponent } from '../../common/components/button/button.component';
import { DataTableColumn, DataTableComponent } from '../../common/components/data-table/data-table.component';
import { DialogComponent } from '../../common/components/dialog/dialog.component';
import { PaginationComponent } from '../../common/components/pagination/pagination.component';
import { StatCardComponent } from '../../common/components/stat-card/stat-card.component';
import { StatusTagComponent } from '../../common/components/status-tag/status-tag.component';
import { SearchService } from '../../common/services/search.service';
import { formatDateTime } from '../../common/utils/datetime.util';
import { describeHttpError } from '../../common/utils/http-error.util';
import { createPagedList } from '../../common/utils/paged-list.util';
import { createReloadable } from '../../common/utils/reloadable.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { TransactionDetailDialogComponent } from '../components/transaction-detail-dialog/transaction-detail-dialog.component';
import {
  DEFAULT_TRANSACTION_QUERY,
  PAYMENT_STATUS_EDITOR_ROLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENTS_PAGE_SIZE,
} from '../constants/payments.constants';
import { PaymentStatus, Transaction, TransactionQuery, TransactionSortField } from '../models/payment.model';
import { PaymentsApiService } from '../services/payments-api.service';
import {
  fromQueryParams,
  nextPaymentStatuses,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  paymentSummaryCards,
  sameQuery,
  toQueryParams,
} from '../utils/payment.util';

type DetailLoad =
  { id: string; transaction: Transaction; error: null } | { id: string; transaction: null; error: unknown };

// Payments under Finance: summary cards per status and gross revenue (per currency), the transactions with status and
// currency filters, search (header search box) and server-side paging, a detail popup, and a status change for the
// roles that may make one. Filters, search, page and order live in the address, so a reload shows the same rows.
@Component({
  selector: 'app-payment-list-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    DataTableComponent,
    DialogComponent,
    PaginationComponent,
    StatCardComponent,
    StatusTagComponent,
    TransactionDetailDialogComponent,
  ],
  templateUrl: './payment-list.component.html',
  styleUrl: './payment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentListPage {
  private readonly paymentsApi = inject(PaymentsApiService);
  private readonly authService = inject(AuthService);
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detailRequests = new Subject<string>();
  private readonly initialQuery = fromQueryParams(this.route.snapshot.queryParamMap);

  readonly pageSize = PAYMENTS_PAGE_SIZE;
  readonly statuses = PAYMENT_STATUSES.map((status) => ({ status, label: PAYMENT_STATUS_LABELS[status] }));
  readonly canChangeStatus = computed(() => this.authService.hasAnyRole(PAYMENT_STATUS_EDITOR_ROLES));

  readonly list = createPagedList<Transaction, TransactionQuery>({
    initialQuery: this.initialQuery,
    load: (query) => this.paymentsApi.getTransactions$(query),
  });
  readonly summary = createReloadable(() => this.paymentsApi.getSummary$());

  // After a failed load the cards show dashes, not totals that may be out of date.
  private readonly summaryValue = computed(() => (this.summary.errorStatus() === null ? this.summary.value() : null));
  readonly summaryCards = computed(() => paymentSummaryCards(this.summaryValue(), this.list.query().currency));
  // The currencies the backend has totals for, plus one from the address that it doesn't know.
  readonly currencies = computed(() => {
    const codes = this.summary.value()?.byCurrency.map((entry) => entry.currency) ?? [];
    const chosen = this.list.query().currency;
    return chosen && !codes.includes(chosen) ? [...codes, chosen] : codes;
  });
  // Why the list holds no currencies yet.
  readonly currencyHint = computed(() => {
    if (this.summary.value()) return null;
    return this.summary.errorStatus() === null ? 'Loading currencies…' : "Couldn't load the currencies";
  });
  // A currency filter the summary has no totals for.
  readonly currencyWithoutTotals = computed(() => {
    const summary = this.summaryValue();
    const currency = this.list.query().currency;
    return summary && currency && !summary.byCurrency.some((entry) => entry.currency === currency) ? currency : null;
  });

  // Amount sorts only within one currency: the backend orders raw amounts, so €15 and $15 would rank as equal.
  readonly columns = computed<DataTableColumn[]>(() => [
    { key: 'reference', label: 'Reference', width: '128px' },
    { key: 'customer', label: 'Customer', shaded: true },
    { key: 'description', label: 'Description' },
    { key: 'method', label: 'Method', shaded: true, width: '104px' },
    { key: 'amount', label: 'Amount', width: '104px', sortable: !!this.list.query().currency },
    { key: 'status', label: 'Status', shaded: true, width: '112px' },
    { key: 'createdAt', label: 'Date', width: '152px', sortable: true },
  ]);

  readonly hasFilters = computed(() => {
    const { status, currency, search } = this.list.query();
    return !!(status || currency || search);
  });
  readonly emptyMessage = computed(() =>
    this.hasFilters() ? 'No transactions match these filters.' : 'No transactions yet.'
  );

  // The open transaction, and the status waiting for confirmation (shown over the popup).
  readonly selected = signal<Transaction | null>(null);
  // The popup can't offer a change: the transaction is gone, or its copy is from before a change.
  readonly changeBlocked = signal(false);
  readonly refreshing = signal(false);
  readonly confirming = signal<PaymentStatus | null>(null);
  readonly isSaving = signal(false);
  // A failed change shows in the confirmation; trouble loading the transaction shows in the popup.
  readonly actionError = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly confirmHeading = computed(() => {
    const status = this.confirming();
    const transaction = this.selected();
    return status && transaction
      ? `Change ${transaction.reference} from ${paymentStatusLabel(transaction.status)} to ${paymentStatusLabel(status)}?`
      : '';
  });
  // The backend only updates the record: no transition rules, and Refunded doesn't issue a real refund.
  readonly confirmDescription =
    'This only updates the payment’s status, for the whole team. No money is refunded or charged. The summary totals change with it.';

  readonly formatDateTime = formatDateTime;
  readonly methodLabel = paymentMethodLabel;
  readonly statusLabel = paymentStatusLabel;
  readonly statusTone = paymentStatusTone;

  constructor() {
    // A search restored from the address shows in the header search box.
    if (this.initialQuery.search) {
      this.searchService.setQuery(this.initialQuery.search);
    }

    // Keeps the filters, search, page and order in the address without adding history entries. Not while another page
    // is opening (a search typed just before leaving): that would cancel the user's navigation.
    effect(() => {
      const queryParams = toQueryParams(this.list.query());
      const navigation = untracked(() => this.router.currentNavigation());
      if (navigation && pathOf(this.router.serializeUrl(navigation.extractedUrl)) !== pathOf(this.router.url)) {
        return;
      }
      void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
    });

    // And the other way: an address that changes while the page stays open (the sidebar's Payments link, Back)
    // sets the filters, search, page and order to match it.
    this.route.queryParamMap.pipe(map(fromQueryParams), takeUntilDestroyed()).subscribe((query) => {
      const current = this.list.query();
      if (sameQuery(query, current)) {
        return;
      }
      this.list.query.set(query);
      if (query.search !== current.search) {
        this.searchService.setQuery(query.search);
      }
    });

    // The open transaction is loaded again from its detail endpoint; the row's copy shows meanwhile.
    this.detailRequests
      .pipe(
        switchMap((id) =>
          this.paymentsApi.getTransaction$(id).pipe(
            map((transaction): DetailLoad => ({ id, transaction, error: null })),
            catchError((error: unknown): Observable<DetailLoad> => of({ id, transaction: null, error }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((load) => this.showDetail(load));
  }

  filterByStatus(status: PaymentStatus | ''): void {
    this.list.query.update((query) => ({ ...query, status, page: 1 }));
  }

  // Leaving one currency also leaves the Amount order, which only works within a currency.
  filterByCurrency(currency: string): void {
    this.list.query.update((query) => {
      const next = { ...query, currency, page: 1 };
      if (currency || query.sortBy !== 'amount') {
        return next;
      }
      return { ...next, sortBy: DEFAULT_TRANSACTION_QUERY.sortBy, sortOrder: DEFAULT_TRANSACTION_QUERY.sortOrder };
    });
  }

  // Another column sorts newest or largest first; the same column again flips the order.
  sortBy(key: string): void {
    const field = key as TransactionSortField;
    this.list.query.update((query) =>
      query.sortBy === field
        ? { ...query, sortOrder: query.sortOrder === 'desc' ? 'asc' : 'desc', page: 1 }
        : { ...query, sortBy: field, sortOrder: 'desc', page: 1 }
    );
  }

  open(transaction: Transaction): void {
    if (this.confirming()) {
      return;
    }
    this.actionError.set(null);
    this.detailError.set(null);
    this.changeBlocked.set(false);
    this.refreshing.set(false);
    this.selected.set(transaction);
    this.detailRequests.next(transaction.id);
  }

  // Not while a change is being saved.
  close(): void {
    if (this.isSaving()) {
      return;
    }
    this.selected.set(null);
    this.confirming.set(null);
    this.changeBlocked.set(false);
    this.refreshing.set(false);
    this.actionError.set(null);
    this.detailError.set(null);
  }

  askToChange(status: PaymentStatus): void {
    this.actionError.set(null);
    this.confirming.set(status);
  }

  cancelChange(): void {
    if (!this.isSaving()) {
      this.confirming.set(null);
    }
  }

  changeStatus(): void {
    const transaction = this.selected();
    const status = this.confirming();
    if (!transaction || !status || this.isSaving()) {
      return;
    }
    if (!nextPaymentStatuses(transaction.status).includes(status)) {
      this.confirming.set(null);
      return;
    }
    this.isSaving.set(true);
    this.actionError.set(null);
    this.paymentsApi
      .changeStatus$(transaction.id, status)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.confirming.set(null);
          this.refreshing.set(true);
          this.detailRequests.next(transaction.id);
          this.list.reload();
          this.summary.reload();
        },
        error: (error: unknown) => {
          if (isNotFound(error)) {
            this.showGone();
            return;
          }
          this.actionError.set(describeHttpError(error, "Couldn't change the status. Please try again."));
        },
      });
  }

  private showDetail(load: DetailLoad): void {
    if (this.selected()?.id !== load.id) {
      return;
    }
    const afterChange = this.refreshing();
    this.refreshing.set(false);
    if (load.transaction) {
      this.selected.set(load.transaction);
      // The newer copy may not allow the move waiting for confirmation.
      const pending = this.confirming();
      if (pending && !nextPaymentStatuses(load.transaction.status).includes(pending)) {
        this.confirming.set(null);
        this.detailError.set('This transaction changed meanwhile. Check its status before changing it.');
      }
    } else if (isNotFound(load.error)) {
      this.showGone();
    } else if (afterChange) {
      // The change went through, but this copy is from before it.
      this.changeBlocked.set(true);
      this.detailError.set("The status was changed, but the new copy couldn't be loaded. Close and reopen it.");
    } else {
      this.detailError.set("Couldn't load the latest copy of this transaction. Close it and open it again to retry.");
    }
  }

  // The transaction was deleted meanwhile: the popup says so, and the list and totals catch up.
  private showGone(): void {
    this.confirming.set(null);
    this.refreshing.set(false);
    this.changeBlocked.set(true);
    this.detailError.set('This transaction no longer exists.');
    this.list.reload();
    this.summary.reload();
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}
