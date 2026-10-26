import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STATS } from '../../testing/match.fixtures';
import { MatchStatsComponent } from './match-stats.component';

describe('MatchStatsComponent', () => {
  let fixture: ComponentFixture<MatchStatsComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MatchStatsComponent] }).compileComponents();
    fixture = TestBed.createComponent(MatchStatsComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('compares the event counts of both teams for the types that happened', () => {
    fixture.componentRef.setInput('stats', STATS);
    fixture.detectChanges();

    expect(element.querySelector('caption')?.textContent?.trim()).toBe('4 events');
    expect(Array.from(element.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual([
      'Fan City',
      'Event',
      'Buzzer United',
    ]);
    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.children).map((cell) => cell.textContent?.trim())
    );
    expect(rows).toEqual([
      ['2', 'Goal', '1'],
      ['1', 'Foul', '0'],
    ]);
  });

  it('says when nothing has happened yet', () => {
    fixture.componentRef.setInput('stats', {
      ...STATS,
      totalEvents: 0,
      home: { team: 'A', events: {} },
      away: { team: 'B', events: {} },
    });
    fixture.detectChanges();
    expect(element.querySelector('.match-stats__empty')?.textContent).toBe('No events yet.');
  });

  it('shows placeholders while loading and a message when loading failed', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(element.querySelectorAll('app-skeleton').length).toBe(9);

    fixture.componentRef.setInput('failed', true);
    fixture.detectChanges();
    expect(element.querySelector('.match-stats__empty')?.textContent).toBe('The stats could not be loaded.');
  });
});
