import { HttpErrorResponse } from '@angular/common/http';
import { Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';

export interface Reloadable<T> {
  readonly value: Signal<T | null>;
  readonly loading: Signal<boolean>;
  // HTTP status of the last failure (0 when the server couldn't be reached), or null after a success.
  readonly errorStatus: Signal<number | null>;
  reload(): void;
}

type Load<T> = { value: T; errorStatus: null } | { value: null; errorStatus: number };

// Loads a value (an entity, a set of totals) and loads it again on reload(). A failed reload keeps the last value.
// With a key (a route id), it waits for the key and starts fresh whenever the key changes.
// Call it in an injection context (a field initializer or constructor); it stops with the component.
export function createReloadable<T>(load: (key: string) => Observable<T>, key?: Signal<string>): Reloadable<T> {
  const value = signal<T | null>(null);
  const loading = signal(true);
  const errorStatus = signal<number | null>(null);
  const reload$ = new BehaviorSubject<void>(undefined);

  const key$ = key
    ? toObservable(key).pipe(
        filter((id) => !!id),
        distinctUntilChanged(),
        tap(() => value.set(null))
      )
    : of('');

  combineLatest([key$, reload$])
    .pipe(
      tap(() => loading.set(true)),
      switchMap(([id]) =>
        load(id).pipe(
          map((loaded): Load<T> => ({ value: loaded, errorStatus: null })),
          catchError((error: unknown): Observable<Load<T>> =>
            of({ value: null, errorStatus: error instanceof HttpErrorResponse ? error.status : 0 })
          )
        )
      ),
      takeUntilDestroyed()
    )
    .subscribe((result) => {
      loading.set(false);
      errorStatus.set(result.errorStatus);
      if (result.value !== null) {
        value.set(result.value);
      }
    });

  return {
    value: value.asReadonly(),
    loading: loading.asReadonly(),
    errorStatus: errorStatus.asReadonly(),
    reload: () => reload$.next(),
  };
}
