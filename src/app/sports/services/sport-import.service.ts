import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, concatMap, from, map, Observable, of, retry, scan, startWith, throwError, timer } from 'rxjs';
import { describeHttpError } from '../../common/utils/http-error.util';
import { IMPORT_RATE_LIMIT_RETRIES, IMPORT_RATE_LIMIT_WAIT_MS } from '../constants/sports.constants';
import { SportImportProgress, SportImportRow } from '../models/sport-import.model';
import { SportsApiService } from './sports-api.service';

type RowResult =
  | { row: SportImportRow; outcome: 'added' }
  | { row: SportImportRow; outcome: 'skipped' }
  | { row: SportImportRow; outcome: 'failed'; message: string };

// Bulk import into the sports catalogue. There is no bulk endpoint, so each row is POSTed on its own.
@Injectable({ providedIn: 'root' })
export class SportImportService {
  private readonly sportsApi = inject(SportsApiService);

  // Sends the rows one after another, never in parallel, and emits the running totals before the first row
  // and after each one.
  import$(rows: readonly SportImportRow[]): Observable<SportImportProgress> {
    const start: SportImportProgress = { total: rows.length, done: 0, added: 0, skipped: 0, failures: [] };
    return from(rows).pipe(
      concatMap((row) => this.importRow$(row)),
      scan(tally, start),
      startWith(start)
    );
  }

  private importRow$(row: SportImportRow): Observable<RowResult> {
    return this.sportsApi.createSport$(row.sport).pipe(
      retry({
        count: IMPORT_RATE_LIMIT_RETRIES,
        delay: (error: unknown) => (isRateLimited(error) ? timer(IMPORT_RATE_LIMIT_WAIT_MS) : throwError(() => error)),
      }),
      map((): RowResult => ({ row, outcome: 'added' })),
      catchError((error: unknown) =>
        of<RowResult>(
          error instanceof HttpErrorResponse && error.status === 409
            ? { row, outcome: 'skipped' }
            : { row, outcome: 'failed', message: describeImportError(error) }
        )
      )
    );
  }
}

function tally(progress: SportImportProgress, result: RowResult): SportImportProgress {
  const done = progress.done + 1;
  if (result.outcome === 'added') return { ...progress, done, added: progress.added + 1 };
  if (result.outcome === 'skipped') return { ...progress, done, skipped: progress.skipped + 1 };
  const failure = { row: result.row.row, name: result.row.sport.name, message: result.message };
  return { ...progress, done, failures: [...progress.failures, failure] };
}

function isRateLimited(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 429;
}

function describeImportError(error: unknown): string {
  if (isRateLimited(error)) {
    return 'The server kept refusing requests (rate limit). Import this row again later.';
  }
  const status = error instanceof HttpErrorResponse ? ` (HTTP ${error.status})` : '';
  return describeHttpError(error, `The server didn't add it${status}.`);
}
