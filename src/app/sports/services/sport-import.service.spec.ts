import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { defer, Observable, of, Subject, throwError } from 'rxjs';
import { IMPORT_RATE_LIMIT_WAIT_MS } from '../constants/sports.constants';
import { SportImportProgress, SportImportRow } from '../models/sport-import.model';
import { Sport, SportInput } from '../models/sport.model';
import { SportImportService } from './sport-import.service';
import { SportsApiService } from './sports-api.service';

const rows = (...names: string[]): SportImportRow[] =>
  names.map((name, index) => ({ row: index + 1, sport: { name } }));
const httpError = (status: number, body: unknown = null): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: body });

describe('SportImportService', () => {
  let createSport$: ReturnType<typeof vi.fn<(input: SportInput) => Observable<Sport>>>;
  let service: SportImportService;

  beforeEach(() => {
    createSport$ = vi.fn<(input: SportInput) => Observable<Sport>>();
    TestBed.configureTestingModule({ providers: [{ provide: SportsApiService, useValue: { createSport$ } }] });
    service = TestBed.inject(SportImportService);
  });

  afterEach(() => vi.useRealTimers());

  const run = (input: SportImportRow[]): SportImportProgress[] => {
    const updates: SportImportProgress[] = [];
    service.import$(input).subscribe((progress) => updates.push(progress));
    return updates;
  };

  it('counts 201 as added, 409 as skipped and anything else as a failure', () => {
    createSport$.mockImplementation(({ name }) => {
      if (name === 'Soccer') return throwError(() => httpError(409));
      if (name === '') {
        return throwError(() =>
          httpError(400, { success: false, error: { message: 'Validation failed', details: { name: ['Required'] } } })
        );
      }
      if (name === 'Broken') return throwError(() => httpError(500));
      return of({} as Sport);
    });
    const updates = run(rows('Padel', 'Soccer', '', 'Broken'));
    expect(updates.map((update) => update.done)).toEqual([0, 1, 2, 3, 4]);
    expect(updates.at(-1)).toEqual({
      total: 4,
      done: 4,
      added: 1,
      skipped: 1,
      failures: [
        { row: 3, name: '', message: 'Required' },
        { row: 4, name: 'Broken', message: "The server didn't add it (HTTP 500)." },
      ],
    });
  });

  it('sends one row at a time, never in parallel', () => {
    const pending = [new Subject<Sport>(), new Subject<Sport>()];
    createSport$.mockImplementation(() => pending[createSport$.mock.calls.length - 1]);
    const updates = run(rows('Padel', 'Squash'));
    expect(createSport$).toHaveBeenCalledTimes(1);

    pending[0].next({} as Sport);
    pending[0].complete();
    expect(createSport$).toHaveBeenCalledTimes(2);
    expect(updates.at(-1)?.done).toBe(1);
  });

  it('waits and tries the same row again when the server rate limits', () => {
    vi.useFakeTimers();
    let calls = 0;
    // Like an HTTP request, each subscription is a new attempt.
    createSport$.mockImplementation(() =>
      defer(() => (++calls === 1 ? throwError(() => httpError(429)) : of({} as Sport)))
    );
    const updates = run(rows('Padel'));
    expect(updates.at(-1)?.done).toBe(0);

    vi.advanceTimersByTime(IMPORT_RATE_LIMIT_WAIT_MS);
    expect(calls).toBe(2);
    expect(updates.at(-1)).toMatchObject({ done: 1, added: 1, failures: [] });
  });
});
