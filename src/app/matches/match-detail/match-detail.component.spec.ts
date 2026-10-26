import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { Match, MatchStatus } from '../models/match.model';
import { MatchesApiService } from '../services/matches-api.service';
import { match, matchEvent, STATS } from '../testing/match.fixtures';
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
  };

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
    };
    await TestBed.configureTestingModule({
      imports: [MatchDetailPage],
      providers: [
        provideRouter([]),
        { provide: MatchesApiService, useValue: api },
        { provide: AuthService, useValue: { hasAnyRole: () => canEdit } },
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
});
