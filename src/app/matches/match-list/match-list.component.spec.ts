import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { authServiceAs } from '../../../testing/auth.fixtures';
import { UserRole } from '../../auth/models/auth.model';
import { FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../../common/constants/http.constants';
import { ApiListResponse } from '../../common/models/api.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { DEFAULT_MATCH_QUERY } from '../constants/matches.constants';
import { Match, MatchQuery, MatchStatus } from '../models/match.model';
import { MatchListStateService } from '../services/match-list-state.service';
import { MatchesApiService } from '../services/matches-api.service';
import { MatchListPage } from './match-list.component';

const team = (id: string, name: string): Match['homeTeam'] => ({ id, name, shortName: null, logoUrl: null });

const match = (id: string, status: MatchStatus, venue: string | null = 'Arena'): Match => ({
  id,
  sportId: 's1',
  homeTeamId: 't1',
  awayTeamId: 't2',
  status,
  scheduledAt: '2026-11-02T13:30:00.000Z',
  startedAt: status === 'SCHEDULED' ? null : '2026-11-02T13:31:00.000Z',
  finishedAt: null,
  homeScore: 2,
  awayScore: 1,
  venue,
  createdAt: '2026-10-26T00:00:00Z',
  updatedAt: '2026-10-26T00:00:00Z',
  createdBy: 'u1',
  homeTeam: team('t1', 'Fan City'),
  awayTeam: team('t2', 'Buzzer United'),
  sport: { id: 's1', name: 'Hockey', iconUrl: null },
});

const page = (matches: Match[], total: number): ApiListResponse<Match> => ({
  success: true,
  data: matches,
  meta: { page: 1, limit: 10, total, totalPages: Math.max(1, Math.ceil(total / 10)) },
});

describe('MatchListPage', () => {
  let fixture: ComponentFixture<MatchListPage>;
  let element: HTMLElement;
  let api: {
    getMatches$: ReturnType<typeof vi.fn<(query: MatchQuery) => Observable<ApiListResponse<Match>>>>;
    createMatch$: ReturnType<typeof vi.fn>;
    updateMatch$: ReturnType<typeof vi.fn>;
    deleteMatch$: ReturnType<typeof vi.fn>;
    getSportOptions$: ReturnType<typeof vi.fn>;
    getTeams$: ReturnType<typeof vi.fn>;
  };

  async function setUp(role: UserRole = 'ADMIN', savedQuery?: MatchQuery): Promise<void> {
    api = {
      getMatches$: vi.fn(() => of(page([match('a', 'LIVE'), match('b', 'SCHEDULED', null)], 12))),
      createMatch$: vi.fn(() => of(match('c', 'SCHEDULED'))),
      updateMatch$: vi.fn(() => of(match('a', 'LIVE'))),
      deleteMatch$: vi.fn(() => of(undefined)),
      getSportOptions$: vi.fn(() => of([{ id: 's1', name: 'Hockey', iconUrl: null }])),
      getTeams$: vi.fn(() => of([team('t1', 'Fan City'), team('t2', 'Buzzer United')])),
    };
    TestBed.configureTestingModule({
      imports: [MatchListPage],
      providers: [
        provideRouter([]),
        { provide: MatchesApiService, useValue: api },
        { provide: AuthService, useValue: authServiceAs(role) },
      ],
    });
    if (savedQuery) {
      TestBed.inject(MatchListStateService).query.set(savedQuery);
    }
    fixture = TestBed.createComponent(MatchListPage);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const lastQuery = (): MatchQuery => api.getMatches$.mock.lastCall![0];
  const buttonWithText = (text: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.trim() === text)!;
  const rowCells = (index: number): string[] =>
    Array.from(element.querySelectorAll('tbody tr')[index].querySelectorAll('td')).map(
      (cell) => cell.textContent?.trim() ?? ''
    );

  it('shows the first page of matches with their status, score and venue', async () => {
    await setUp();
    expect(lastQuery()).toEqual(DEFAULT_MATCH_QUERY);
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Sport',
      'Home vs Away',
      'Scheduled At',
      'Venue',
      'Status',
      'Score',
      'Actions',
    ]);
    expect(rowCells(0).slice(1, 6)).toEqual([
      'Fan City vs Buzzer United',
      expect.any(String),
      'Arena',
      'Live',
      '2 – 1',
    ]);
    expect(element.querySelector('tbody tr .status-tag__dot')).not.toBeNull();
    expect(rowCells(1).slice(3, 6)).toEqual(['—', 'Scheduled', '—']);
    expect(element.textContent).toContain('1–10 of 12');
  });

  it('filters by status on the server, back on page 1', async () => {
    await setUp();
    buttonWithText('Next').click();
    await settle();
    expect(lastQuery().page).toBe(2);

    buttonWithText('Finished').click();
    await settle();
    expect(lastQuery()).toMatchObject({ status: 'FINISHED', page: 1 });
    expect(element.querySelector('.tabs__tab--active')?.textContent?.trim()).toBe('Finished');
  });

  it('sorts by scheduled time earliest first, then latest first, then back to newest first', async () => {
    await setUp();
    for (const expected of [
      { sortBy: 'scheduledAt', sortOrder: 'asc' },
      { sortBy: 'scheduledAt', sortOrder: 'desc' },
      { sortBy: 'createdAt', sortOrder: 'desc' },
    ]) {
      (element.querySelector('.data-table__sort') as HTMLButtonElement).click();
      await settle();
      expect(lastQuery()).toMatchObject(expected);
    }
  });

  it('comes back on the tab and page it was left on', async () => {
    await setUp('ADMIN', { ...DEFAULT_MATCH_QUERY, status: 'LIVE', page: 2 });
    expect(lastQuery()).toMatchObject({ status: 'LIVE', page: 2 });

    buttonWithText('Cancelled').click();
    await settle();
    expect(TestBed.inject(MatchListStateService).query()).toMatchObject({ status: 'CANCELLED', page: 1 });
  });

  for (const [role, allowed] of [
    ['ADMIN', true],
    ['OPERATOR', true],
    ['VIEWER', false],
    ['ORG', false],
  ] as const) {
    it(`${allowed ? 'offers' : 'offers no'} Schedule Match and the row Edit and Delete to ${role}`, async () => {
      await setUp(role);
      expect(!!buttonWithText('Schedule Match')).toBe(allowed);
      expect(!!element.querySelector('button[aria-label="Edit Fan City vs Buzzer United"]')).toBe(allowed);
      expect(!!element.querySelector('button[aria-label="Delete Fan City vs Buzzer United"]')).toBe(allowed);
      expect(
        Array.from(element.querySelectorAll('th'))
          .map((th) => th.textContent?.trim())
          .includes('Actions')
      ).toBe(allowed);
      expect(element.querySelectorAll('tbody tr').length).toBe(2);
    });
  }

  it('says why the matches could not be loaded, and loads them again on Try again', async () => {
    await setUp();
    api.getMatches$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
    buttonWithText('Finished').click();
    await settle();
    const row = element.querySelector('.match-list__error') as HTMLElement;
    expect(row.querySelector('span')?.textContent).toBe(RATE_LIMITED_MESSAGE);

    buttonWithText('Try again').click();
    await settle();
    expect(lastQuery()).toMatchObject({ status: 'FINISHED' });
    expect(element.querySelector('.match-list__error')).toBeNull();
    expect(rowCells(0)[1]).toBe('Fan City vs Buzzer United');
  });

  it('says why the sports for a new match could not be loaded', async () => {
    await setUp();
    api.getSportOptions$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
    buttonWithText('Schedule Match').click();
    await settle();
    expect(element.querySelector('.match-form__error')?.textContent).toBe(RATE_LIMITED_MESSAGE);
  });

  it("says why a sport's teams could not be loaded", async () => {
    await setUp();
    api.getTeams$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    buttonWithText('Schedule Match').click();
    await settle();
    const sport = element.querySelector('#match-sport') as HTMLSelectElement;
    sport.value = 's1';
    sport.dispatchEvent(new Event('change'));
    await settle();
    expect(api.getTeams$).toHaveBeenCalledWith('s1');
    expect(element.querySelector('.match-form__error')?.textContent).toBe(FORBIDDEN_LOAD_MESSAGE);
  });

  it('schedules a match and shows it on page 1 of the Scheduled tab', async () => {
    await setUp('ADMIN', { ...DEFAULT_MATCH_QUERY, status: 'LIVE', page: 2 });
    buttonWithText('Schedule Match').click();
    await settle();
    expect(api.getSportOptions$).toHaveBeenCalledTimes(1);

    fixture.componentInstance.chooseSport('s1');
    expect(api.getTeams$).toHaveBeenCalledWith('s1');
    fixture.componentInstance.saveMatch({
      sportId: 's1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      scheduledAt: '2026-11-02T13:30:00.000Z',
      venue: '',
    });
    await settle();

    expect(api.createMatch$).toHaveBeenCalledWith({
      sportId: 's1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      scheduledAt: '2026-11-02T13:30:00.000Z',
    });
    expect(element.querySelector('.match-form')).toBeNull();
    expect(lastQuery()).toMatchObject({ status: 'SCHEDULED', page: 1 });
  });

  it('shows a 400 from the backend as a readable error and keeps the popup open', async () => {
    await setUp();
    api.createMatch$.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { success: false, error: { message: 'Validation failed' } } })
      )
    );
    buttonWithText('Schedule Match').click();
    await settle();
    fixture.componentInstance.saveMatch({
      sportId: 's1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      scheduledAt: '2026-11-02T13:30:00.000Z',
      venue: 'Arena',
    });
    await settle();

    expect(element.querySelector('.match-form__error')?.textContent).toBe(
      'The backend rejected this match. Check that home and away are two different teams of the sport.'
    );
    expect(element.querySelector('.match-form')).not.toBeNull();
  });

  it('edits the date, time and venue of a match', async () => {
    await setUp();
    (element.querySelector('button[aria-label="Edit Fan City vs Buzzer United"]') as HTMLButtonElement).click();
    await settle();
    expect(element.querySelector('.modal__title')?.textContent).toBe('Edit Match');

    fixture.componentInstance.saveMatch({
      sportId: '',
      homeTeamId: '',
      awayTeamId: '',
      scheduledAt: '2026-11-03T10:00:00.000Z',
      venue: 'Stadium',
    });
    await settle();
    expect(api.updateMatch$).toHaveBeenCalledWith('a', { scheduledAt: '2026-11-03T10:00:00.000Z', venue: 'Stadium' });
  });

  it('deletes a match after confirmation and reloads the list', async () => {
    await setUp();
    (element.querySelectorAll('button[aria-label^="Delete"]')[0] as HTMLButtonElement).click();
    await settle();
    expect(element.textContent).toContain('Delete Fan City vs Buzzer United?');

    const calls = api.getMatches$.mock.calls.length;
    buttonWithText('Delete').click();
    await settle();
    expect(api.deleteMatch$).toHaveBeenCalledWith('a');
    expect(api.getMatches$.mock.calls.length).toBe(calls + 1);
    expect(element.textContent).not.toContain('Delete Fan City vs Buzzer United?');
  });
});
