import { Signal, signal, WritableSignal, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  skip,
  switchMap,
  tap,
} from 'rxjs';
import { ApiListResponse } from '../models/api.model';
import { SearchService } from '../services/search.service';

export interface PagedQuery {
  search: string;
  page: number;
  limit: number;
}

export interface PagedList<T, Q extends PagedQuery> {
  readonly query: WritableSignal<Q>;
  readonly rows: Signal<readonly T[]>;
  readonly total: Signal<number>;
  readonly loading: Signal<boolean>;
  readonly failed: Signal<boolean>;
  goToPage(page: number): void;
  reload(): void;
}

export interface PagedListOptions<T, Q extends PagedQuery> {
  initialQuery: Q;
  load: (query: Q, parentId: string) => Observable<ApiListResponse<T>>;
  // For lists under a parent (a sport's governing bodies, ...): waits for the id and starts again on page 1 when it changes.
  parentId?: Signal<string>;
}

interface PageLoad<T, Q> {
  query: Q;
  response: ApiListResponse<T> | null;
}

// A server-paged list that follows the header search (debounced, back to page 1) and can be reloaded.
// Call it in an injection context (a field initializer or constructor); it stops with the component.
export function createPagedList<T, Q extends PagedQuery>(options: PagedListOptions<T, Q>): PagedList<T, Q> {
  const searchService = inject(SearchService);
  const query = signal(options.initialQuery);
  const rows = signal<readonly T[]>([]);
  const total = signal(0);
  const loading = signal(true);
  const failed = signal(false);
  const reload$ = new BehaviorSubject<void>(undefined);
  const goToPage = (page: number): void => query.update((current) => ({ ...current, page }));

  searchService.query$
    .pipe(
      map((search) => search.trim()),
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    )
    .subscribe((search) =>
      query.update((current) => (current.search === search ? current : { ...current, search, page: 1 }))
    );

  const parentId$ = options.parentId
    ? toObservable(options.parentId).pipe(
        filter((id) => !!id),
        distinctUntilChanged()
      )
    : of('');
  parentId$.pipe(skip(1), takeUntilDestroyed()).subscribe(() => goToPage(1));

  combineLatest([parentId$, toObservable(query), reload$])
    .pipe(
      tap(() => loading.set(true)),
      switchMap(([parentId, current]) =>
        options.load(current, parentId).pipe(
          map((response): PageLoad<T, Q> => ({ query: current, response })),
          catchError((): Observable<PageLoad<T, Q>> => of({ query: current, response: null }))
        )
      ),
      takeUntilDestroyed()
    )
    .subscribe(({ query: loaded, response }) => {
      loading.set(false);
      failed.set(!response);
      if (!response) {
        return;
      }
      // A delete can empty the last page; step back to the page that now exists.
      if (response.data.length === 0 && loaded.page > response.meta.totalPages) {
        goToPage(Math.max(1, response.meta.totalPages));
        return;
      }
      rows.set(response.data);
      total.set(response.meta.total);
    });

  return {
    query,
    rows: rows.asReadonly(),
    total: total.asReadonly(),
    loading: loading.asReadonly(),
    failed: failed.asReadonly(),
    goToPage,
    reload: () => reload$.next(),
  };
}
