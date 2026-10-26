import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AWAY, HOME, matchEvent } from '../../testing/match.fixtures';
import { MatchTimelineComponent } from './match-timeline.component';

describe('MatchTimelineComponent', () => {
  let fixture: ComponentFixture<MatchTimelineComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MatchTimelineComponent] }).compileComponents();
    fixture = TestBed.createComponent(MatchTimelineComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  const rows = (): string[][] =>
    Array.from(element.querySelectorAll('tbody tr.data-table__row')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? '')
    );

  it('lists each event with its minute, type, team, player and detail', () => {
    fixture.componentRef.setInput('events', [
      matchEvent('e1', 12, {
        team: HOME,
        playerId: 'p1',
        player: { id: 'p1', firstName: 'Ivan', lastName: 'Gloves', jerseyNumber: 1 },
        detail: 'Header',
      }),
      matchEvent('e2', 30, { type: 'YELLOW_CARD', teamId: null }),
    ]);
    fixture.detectChanges();

    expect(rows()).toEqual([
      ["12'", 'Goal', 'Fan City', 'Ivan Gloves', 'Header'],
      ["30'", 'Yellow card', '—', '—', '—'],
    ]);
    expect(element.querySelector('.status-tag--yellow')?.textContent?.trim()).toBe('Yellow card');
  });

  it('names the team and player of a live event from the loaded teams and players', () => {
    fixture.componentRef.setInput('events', [matchEvent('e1', 5, { teamId: AWAY.id, playerId: 'p9' })]);
    fixture.componentRef.setInput('teams', [HOME, AWAY]);
    fixture.componentRef.setInput('players', [{ id: 'p9', firstName: 'Ana', lastName: 'Silva', jerseyNumber: 9 }]);
    fixture.detectChanges();
    expect(rows()[0].slice(2, 4)).toEqual(['Buzzer United', 'Ana Silva']);
  });

  it('says when there are no events, or when they could not be loaded', () => {
    fixture.componentRef.setInput('events', []);
    fixture.detectChanges();
    expect(element.querySelector('.data-table__empty')?.textContent).toBe('No events yet.');

    fixture.componentRef.setInput('failed', true);
    fixture.detectChanges();
    expect(element.querySelector('.data-table__empty')?.textContent).toBe('The timeline could not be loaded.');
  });
});
