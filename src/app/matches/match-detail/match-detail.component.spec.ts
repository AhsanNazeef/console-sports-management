import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { MatchLiveUpdate } from '../models/match-event.model';
import { Match, MatchStatus } from '../models/match.model';
import { MatchLiveService } from '../services/match-live.service';
import { MatchesApiService } from '../services/matches-api.service';
import { AWAY, HOME, match, matchEvent, STATS } from '../testing/match.fixtures';
import { MatchDetailPage } from './match-detail.component';

describe('MatchDetailPage', () => {
  let fixture: ComponentFixture<MatchDetailPage>;
  let element: HTMLElement;
  let current: Match;
  let api: {
    getMatch$: ReturnType<typeof vi.fn<(id: string) => Observable<Match>>>;
    getScoreboard$: ReturnType<typeof vi.fn>;
    getTimeline$: ReturnType<typeof vi.fn>;
    getStats$: ReturnType<typeof vi.fn>;
    changeStatus$: ReturnType<typeof vi.fn>;
    getPlayers$: ReturnType<typeof vi.fn>;
    addEvent$: ReturnType<typeof vi.fn>;
  };
  // The live connection: what the page subscribed to, and whether it still listens.
  let live: { updates: Subject<MatchLiveUpdate>; watched: string[]; listening: () => boolean };

  async function setUp(status: MatchStatus, canEdit = true): Promise<void> {
    current = match('m1', status);
    api = {
      getMatch$: vi.fn(() => of(current)),
      getScoreboard$: vi.fn(() =>
        of({
          matchId: 'm1',
          status: current.status,
          home: { team: 'Fan City', score: current.homeScore },
          away: { team: 'Buzzer United', score: current.awayScore },
          startedAt: current.startedAt,
        })
      ),
      getTimeline$: vi.fn(() => of([matchEvent('e1', 12)])),
      getStats$: vi.fn(() => of(STATS)),
      // The backend applies the move; the page then reloads the match.
      changeStatus$: vi.fn((id: string, next: MatchStatus) => {
        current = match('m1', next);
        return of(current);
      }),
      getPlayers$: vi.fn((teamId: string) =>
        of([{ id: `${teamId}-p`, firstName: 'Player', lastName: teamId, jerseyNumber: null, teamId }])
      ),
      addEvent$: vi.fn(() => of(matchEvent('e9', 40, { teamId: HOME.id }))),
    };
    const updates = new Subject<MatchLiveUpdate>();
    live = { updates, watched: [], listening: () => updates.observed };
    await TestBed.configureTestingModule({
      imports: [MatchDetailPage],
      providers: [
        provideRouter([]),
        { provide: MatchesApiService, useValue: api },
        { provide: AuthService, useValue: { hasAnyRole: () => canEdit } },
        {
          provide: MatchLiveService,
          useValue: {
            watch$: (id: string) => {
              live.watched.push(id);
              return live.updates.asObservable();
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MatchDetailPage);
    fixture.componentRef.setInput('matchId', 'm1');
    fixture.autoDetectChanges();
    await settle();
    element = fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  const statusButtons = (): string[] =>
    Array.from(element.querySelectorAll('.match-detail__status-actions button')).map(
      (button) => button.textContent?.trim() ?? ''
    );
  const buttonWithText = (text: string, root: ParentNode = element): HTMLButtonElement =>
    Array.from(root.querySelectorAll('button')).find((button) => button.textContent?.trim() === text)!;
  const tag = (): string => element.querySelector('app-match-header app-status-tag')?.textContent?.trim() ?? '';

  it('shows the match header, timeline and stats, with a breadcrumb back to the list', async () => {
    await setUp('LIVE');
    expect(api.getMatch$).toHaveBeenCalledWith('m1');
    expect(element.querySelector('app-breadcrumbs')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Matches Fan City vs Buzzer United'
    );
    expect(element.querySelector('app-breadcrumbs a')?.getAttribute('href')).toBe('/matches');
    expect(element.querySelector('.match-header__score')?.textContent?.trim()).toBe('2 – 1');
    expect(element.querySelectorAll('app-match-timeline tbody tr.data-table__row').length).toBe(1);
    expect(element.querySelector('app-match-stats caption')?.textContent?.trim()).toBe('4 events');
  });

  it('shows only the status buttons the backend allows', async () => {
    await setUp('SCHEDULED');
    expect(statusButtons()).toEqual(['Start Match', 'Cancel Match']);
  });

  it('starts a scheduled match straight away and then offers finish or cancel', async () => {
    await setUp('SCHEDULED');
    buttonWithText('Start Match').click();
    await settle();

    expect(api.changeStatus$).toHaveBeenCalledWith('m1', 'LIVE');
    expect(tag()).toBe('Live');
    expect(statusButtons()).toEqual(['Finish Match', 'Cancel Match']);
  });

  it('asks before finishing, and shows no buttons once finished', async () => {
    await setUp('LIVE');
    buttonWithText('Finish Match').click();
    await settle();
    expect(api.changeStatus$).not.toHaveBeenCalled();
    const dialog = element.querySelector('app-dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Finish Fan City vs Buzzer United?');
    expect(dialog.textContent).toContain('The final score will be 2 – 1.');

    buttonWithText('Finish Match', dialog).click();
    await settle();
    expect(api.changeStatus$).toHaveBeenCalledWith('m1', 'FINISHED');
    expect(tag()).toBe('Finished');
    expect(statusButtons()).toEqual([]);
  });

  it('keeps the match as it is when the cancel confirmation is dismissed', async () => {
    await setUp('SCHEDULED');
    buttonWithText('Cancel Match').click();
    await settle();
    buttonWithText('Go back').click();
    await settle();
    expect(api.changeStatus$).not.toHaveBeenCalled();
    expect(tag()).toBe('Scheduled');
  });

  it('explains a refused move and shows the status the match has now', async () => {
    await setUp('SCHEDULED');
    // Someone else started the match meanwhile.
    api.changeStatus$.mockImplementation(() => {
      current = match('m1', 'LIVE');
      return throwError(() => new HttpErrorResponse({ status: 400 }));
    });
    buttonWithText('Start Match').click();
    await settle();

    expect(element.querySelector('.match-detail__error')?.textContent).toContain('status changed meanwhile');
    expect(tag()).toBe('Live');
    expect(statusButtons()).toEqual(['Finish Match', 'Cancel Match']);
  });

  it('shows no status buttons to roles that cannot change matches', async () => {
    await setUp('LIVE', false);
    expect(statusButtons()).toEqual([]);
  });

  it('says when the match does not exist', async () => {
    await setUp('LIVE');
    api.getMatch$.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    fixture.componentRef.setInput('matchId', 'gone');
    await settle();
    expect(element.querySelector('.match-detail__missing')?.textContent).toContain("doesn't exist");
  });

  const timelineRows = (): string[] =>
    Array.from(element.querySelectorAll('app-match-timeline tbody tr.data-table__row')).map(
      (row) => row.querySelector('td')?.textContent?.trim() ?? ''
    );

  it('follows the match live while the page is open, and stops when it closes', async () => {
    await setUp('LIVE');
    expect(live.watched).toEqual(['m1']);
    expect(live.listening()).toBe(true);

    fixture.destroy();
    expect(live.listening()).toBe(false);
  });

  it('adds a live event to the timeline once, names its player, and refreshes the stats', async () => {
    await setUp('LIVE');
    const statsLoads = api.getStats$.mock.calls.length;
    const event = matchEvent('e2', 5, { teamId: AWAY.id, playerId: `${AWAY.id}-p` });
    live.updates.next({ kind: 'event', event });
    live.updates.next({ kind: 'event', event });
    await settle();

    expect(timelineRows()).toEqual(["5'", "12'"]);
    expect(element.querySelector('app-match-timeline tbody tr td:nth-child(4)')?.textContent?.trim()).toBe(
      `Player ${AWAY.id}`
    );
    expect(api.getStats$.mock.calls.length).toBe(statsLoads + 1);
  });

  it('shows the live score', async () => {
    await setUp('LIVE');
    live.updates.next({
      kind: 'scoreboard',
      scoreboard: {
        matchId: 'm1',
        status: 'LIVE',
        home: { team: 'Fan City', score: 3 },
        away: { team: 'Buzzer United', score: 1 },
        startedAt: null,
      },
    });
    await settle();
    expect(element.querySelector('.match-header__score')?.textContent?.trim()).toBe('3 – 1');
  });

  it('reloads the match when its status changes elsewhere, and hides the event panel once finished', async () => {
    await setUp('LIVE');
    expect(element.querySelector('app-match-event-form')).not.toBeNull();

    current = match('m1', 'FINISHED');
    live.updates.next({ kind: 'status', status: 'FINISHED' });
    await settle();
    expect(tag()).toBe('Finished');
    expect(element.querySelector('app-match-event-form')).toBeNull();
  });

  it('shows the event panel only on a live match and only to roles that can change matches', async () => {
    await setUp('SCHEDULED');
    expect(element.querySelector('app-match-event-form')).toBeNull();
    fixture.destroy();
    TestBed.resetTestingModule();
    await setUp('LIVE', false);
    expect(element.querySelector('app-match-event-form')).toBeNull();
  });

  it('adds an event from the panel and offers both teams’ players', async () => {
    await setUp('LIVE');
    expect(api.getPlayers$.mock.calls.map(([teamId]) => teamId)).toEqual([HOME.id, AWAY.id]);

    fixture.componentInstance.addEvent({ type: 'GOAL', minute: 40, teamId: HOME.id });
    await settle();
    expect(api.addEvent$).toHaveBeenCalledWith('m1', { type: 'GOAL', minute: 40, teamId: HOME.id });
    expect(timelineRows()).toEqual(["12'", "40'"]);
    expect(fixture.componentInstance.eventFormReset()).toBe(1);

    // The same event coming back over the socket changes nothing.
    live.updates.next({ kind: 'event', event: matchEvent('e9', 40, { teamId: HOME.id }) });
    await settle();
    expect(timelineRows()).toEqual(["12'", "40'"]);
  });

  it('shows the backend’s reason when an event is refused', async () => {
    await setUp('LIVE');
    api.addEvent$.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { success: false, error: { message: 'Events can only be added to a live match' } },
          })
      )
    );
    fixture.componentInstance.addEvent({ type: 'FOUL', minute: 3 });
    await settle();
    expect(element.querySelector('.event-form__error')?.textContent).toBe('Events can only be added to a live match');
  });
});
