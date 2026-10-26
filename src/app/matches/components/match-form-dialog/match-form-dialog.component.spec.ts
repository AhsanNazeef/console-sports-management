import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Match, MatchFormValue, MatchSport, MatchTeam } from '../../models/match.model';
import { MatchFormDialogComponent } from './match-form-dialog.component';

const SPORTS: MatchSport[] = [
  { id: 's1', name: 'Hockey', iconUrl: null },
  { id: 's2', name: 'Padel', iconUrl: null },
];
const team = (id: string, name: string): MatchTeam => ({ id, name, shortName: null, logoUrl: null });
const TEAMS = [team('t1', 'Away FC'), team('t2', 'Home FC')];

const MATCH: Match = {
  id: 'm1',
  sportId: 's1',
  homeTeamId: 't2',
  awayTeamId: 't1',
  status: 'SCHEDULED',
  scheduledAt: new Date(2026, 10, 2, 18, 30).toISOString(),
  startedAt: null,
  finishedAt: null,
  homeScore: 0,
  awayScore: 0,
  venue: 'Arena',
  createdAt: '2026-10-26T00:00:00Z',
  updatedAt: '2026-10-26T00:00:00Z',
  createdBy: 'u1',
  homeTeam: TEAMS[1],
  awayTeam: TEAMS[0],
  sport: SPORTS[0],
};

describe('MatchFormDialogComponent', () => {
  let fixture: ComponentFixture<MatchFormDialogComponent>;
  let element: HTMLElement;
  let saved: MatchFormValue[];
  let sportChanges: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MatchFormDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(MatchFormDialogComponent);
    saved = [];
    sportChanges = [];
    fixture.componentInstance.save.subscribe((value) => saved.push(value));
    fixture.componentInstance.sportChange.subscribe((id) => sportChanges.push(id));
    fixture.componentRef.setInput('sports', SPORTS);
    fixture.componentRef.setInput('open', true);
    await render();
    element = fixture.nativeElement as HTMLElement;
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const select = (id: string): HTMLSelectElement => element.querySelector(`#${id}`) as HTMLSelectElement;
  const choose = async (id: string, value: string): Promise<void> => {
    const control = select(id);
    control.value = value;
    control.dispatchEvent(new Event('change'));
    await render();
  };
  const type = async (selector: string, value: string): Promise<void> => {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await render();
  };
  const saveButton = (): HTMLButtonElement => element.querySelector('button[type="submit"]') as HTMLButtonElement;

  async function chooseSportWithTeams(): Promise<void> {
    await choose('match-sport', 's1');
    fixture.componentRef.setInput('teams', TEAMS);
    await render();
  }

  it('asks for the sport first and loads its teams', async () => {
    expect(element.querySelector('.modal__title')?.textContent).toBe('Schedule Match');
    expect(Array.from(select('match-sport').options).map((option) => option.textContent?.trim())).toEqual([
      'Choose a sport',
      'Hockey',
      'Padel',
    ]);
    expect(select('match-home-team').disabled).toBe(true);
    expect(saveButton().disabled).toBe(true);

    await choose('match-sport', 's1');
    expect(sportChanges).toEqual(['s1']);
    expect(select('match-home-team').options[0].textContent?.trim()).toBe('Loading teams…');

    fixture.componentRef.setInput('teams', TEAMS);
    await render();
    expect(select('match-home-team').disabled).toBe(false);
    expect(Array.from(select('match-away-team').options).map((option) => option.textContent?.trim())).toEqual([
      'Choose a team',
      'Away FC',
      'Home FC',
    ]);
  });

  it('says when a sport has fewer than two teams', async () => {
    await choose('match-sport', 's2');
    fixture.componentRef.setInput('teams', [TEAMS[0]]);
    await render();
    expect(element.querySelector('.match-form__hint')?.textContent).toContain('fewer than two teams');
    expect(select('match-home-team').disabled).toBe(true);
  });

  it('blocks the same team twice before submitting', async () => {
    await chooseSportWithTeams();
    await choose('match-home-team', 't2');
    await choose('match-away-team', 't2');
    await type('#match-scheduled-at', '2026-11-02T18:30');

    expect(element.querySelector('#match-team-error')?.textContent).toBe('Home and away must be different teams.');
    expect(select('match-away-team').getAttribute('aria-invalid')).toBe('true');
    expect(saveButton().disabled).toBe(true);

    await choose('match-away-team', 't1');
    expect(element.querySelector('#match-team-error')).toBeNull();
    expect(saveButton().disabled).toBe(false);
  });

  it('emits the match with the time as an ISO timestamp and a trimmed venue', async () => {
    await chooseSportWithTeams();
    await choose('match-home-team', 't2');
    await choose('match-away-team', 't1');
    await type('#match-scheduled-at', '2026-11-02T18:30');
    await type('#match-venue', '  Arena  ');
    saveButton().click();

    expect(saved).toEqual([
      {
        sportId: 's1',
        homeTeamId: 't2',
        awayTeamId: 't1',
        scheduledAt: new Date(2026, 10, 2, 18, 30).toISOString(),
        venue: 'Arena',
      },
    ]);
  });

  it('starts over when the sport changes', async () => {
    await chooseSportWithTeams();
    await choose('match-home-team', 't2');
    await choose('match-sport', 's2');
    expect(fixture.componentInstance.homeTeamId()).toBe('');
  });

  it('edits only the date, time and venue of an existing match', async () => {
    fixture.componentRef.setInput('match', MATCH);
    await render();

    expect(element.querySelector('.modal__title')?.textContent).toBe('Edit Match');
    expect(element.querySelector('#match-sport')).toBeNull();
    expect(element.querySelector('.match-form__fixed')?.textContent).toContain('Home FC vs Away FC');
    expect((element.querySelector('#match-scheduled-at') as HTMLInputElement).value).toBe('2026-11-02T18:30');

    await type('#match-venue', '');
    saveButton().click();
    expect(saved[0]).toMatchObject({ scheduledAt: MATCH.scheduledAt, venue: '' });
  });

  it('shows the error it is given', async () => {
    fixture.componentRef.setInput('error', 'The backend rejected this match.');
    await render();
    expect(element.querySelector('.match-form__error')?.textContent).toBe('The backend rejected this match.');
  });
});
