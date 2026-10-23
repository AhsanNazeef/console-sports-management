import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Breadcrumb, BreadcrumbsComponent } from '../../common/components/breadcrumbs/breadcrumbs.component';
import { ButtonComponent } from '../../common/components/button/button.component';
import { DialogComponent } from '../../common/components/dialog/dialog.component';
import { PaginationComponent } from '../../common/components/pagination/pagination.component';
import { StatCardComponent } from '../../common/components/stat-card/stat-card.component';
import { ApiListResponse } from '../../common/models/api.model';
import { SearchService } from '../../common/services/search.service';
import { describeHttpError } from '../../common/utils/http-error.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { SportFormDialogComponent } from '../components/sport-form-dialog/sport-form-dialog.component';
import { SportsTableComponent } from '../components/sports-table/sports-table.component';
import { DEFAULT_SPORT_QUERY, SPORT_EDITOR_ROLES, SPORTS_PAGE_SIZE } from '../constants/sports.constants';
import { CatalogueTotals, Sport, SportInput, SportQuery } from '../models/sport.model';
import { SportsApiService } from '../services/sports-api.service';

const LOAD_ERROR = "Couldn't load the sports. Please try again.";

interface ListLoad {
  query: SportQuery;
  response: ApiListResponse<Sport> | null;
}

@Component({
  selector: 'app-sport-list-page',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    DialogComponent,
    PaginationComponent,
    SportFormDialogComponent,
    SportsTableComponent,
    StatCardComponent,
  ],
  templateUrl: './sport-list.component.html',
  styleUrl: './sport-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportListPage {
  private readonly sportsApi = inject(SportsApiService);
  private readonly searchService = inject(SearchService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reloadList$ = new BehaviorSubject<void>(undefined);
  private readonly reloadTotals$ = new BehaviorSubject<void>(undefined);

  readonly breadcrumbs: Breadcrumb[] = [{ label: 'Sport' }];
  readonly pageSize = SPORTS_PAGE_SIZE;
  readonly canEdit = computed(() => this.authService.hasAnyRole(SPORT_EDITOR_ROLES));

  readonly query = signal<SportQuery>(DEFAULT_SPORT_QUERY);
  readonly sports = signal<Sport[]>([]);
  readonly total = signal(0);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly totals = signal<CatalogueTotals | null>(null);

  readonly formOpen = signal(false);
  readonly editing = signal<Sport | null>(null);
  readonly deleting = signal<Sport | null>(null);
  readonly isSaving = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly emptyMessage = computed(() => {
    if (this.isLoading()) return 'Loading sports…';
    if (this.loadError()) return 'Sports could not be loaded.';
    const search = this.query().search;
    return search ? `No sports match “${search}”.` : 'No sports yet.';
  });

  constructor() {
    // The header search drives the server-side ?search=, starting again from page 1.
    this.searchService.query$
      .pipe(
        map((search) => search.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((search) =>
        this.query.update((query) => (query.search === search ? query : { ...query, search, page: 1 }))
      );

    combineLatest([toObservable(this.query), this.reloadList$])
      .pipe(
        tap(() => this.isLoading.set(true)),
        switchMap(([query]) =>
          this.sportsApi.getSports$(query).pipe(
            map((response): ListLoad => ({ query, response })),
            catchError((): Observable<ListLoad> => of({ query, response: null }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(({ query, response }) => this.showPage(query, response));

    this.reloadTotals$
      .pipe(
        switchMap(() => this.sportsApi.getCatalogueTotals$().pipe(catchError(() => of(null)))),
        takeUntilDestroyed()
      )
      .subscribe((totals) => this.totals.set(totals));
  }

  goToPage(page: number): void {
    this.query.update((query) => ({ ...query, page }));
  }

  // Newest first → name A–Z → name Z–A → back to newest first.
  cycleNameSort(): void {
    this.query.update((query) => {
      if (query.sortBy !== 'name') return { ...query, sortBy: 'name', sortOrder: 'asc', page: 1 };
      if (query.sortOrder === 'asc') return { ...query, sortOrder: 'desc', page: 1 };
      return { ...query, sortBy: 'createdAt', sortOrder: 'desc', page: 1 };
    });
  }

  retry(): void {
    this.reloadList$.next();
    this.reloadTotals$.next();
  }

  openAdd(): void {
    this.editing.set(null);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  openEdit(sport: Sport): void {
    this.editing.set(sport);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.isSaving()) {
      this.formOpen.set(false);
    }
  }

  saveSport(input: SportInput): void {
    const editing = this.editing();
    const request$ = editing ? this.sportsApi.updateSport$(editing.id, input) : this.sportsApi.createSport$(input);
    this.isSaving.set(true);
    this.actionError.set(null);
    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          if (!editing) {
            // New sports come first in the default order, so show page 1.
            this.query.update((query) => ({ ...query, page: 1 }));
            this.reloadTotals$.next();
          }
          this.reloadList$.next();
        },
        error: (error: unknown) => this.actionError.set(this.describeSaveError(error, input.name)),
      });
  }

  askToDelete(sport: Sport): void {
    this.actionError.set(null);
    this.deleting.set(sport);
  }

  cancelDelete(): void {
    if (!this.isSaving()) {
      this.deleting.set(null);
    }
  }

  deleteSport(): void {
    const sport = this.deleting();
    if (!sport || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.actionError.set(null);
    this.sportsApi
      .deleteSport$(sport.id)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.reloadList$.next();
          this.reloadTotals$.next();
        },
        error: (error: unknown) =>
          this.actionError.set(describeHttpError(error, "Couldn't delete the sport. Please try again.")),
      });
  }

  private showPage(query: SportQuery, response: ApiListResponse<Sport> | null): void {
    this.isLoading.set(false);
    this.loadError.set(response ? null : LOAD_ERROR);
    if (!response) {
      return;
    }
    // A delete can empty the last page; step back to the page that now exists.
    if (response.data.length === 0 && query.page > response.meta.totalPages) {
      this.goToPage(Math.max(1, response.meta.totalPages));
      return;
    }
    this.sports.set(response.data);
    this.total.set(response.meta.total);
  }

  private describeSaveError(error: unknown, name: string): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return `A sport called “${name}” already exists, or was deleted and its name is still reserved. Try another name.`;
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.reloadList$.next();
      return 'This sport no longer exists. Someone may have deleted it.';
    }
    return describeHttpError(error, "Couldn't save the sport. Please try again.");
  }
}
