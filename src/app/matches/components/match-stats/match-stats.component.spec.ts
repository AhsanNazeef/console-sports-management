import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RATE_LIMITED_MESSAGE } from '../../../common/constants/http.constants';
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

  it('shows placeholders while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(element.querySelectorAll('app-skeleton').length).toBe(9);
    expect(element.querySelector('.match-stats__empty')).toBeNull();
  });

  it('shows why the stats could not be loaded in place of the rows', () => {
    fixture.componentRef.setInput('error', RATE_LIMITED_MESSAGE);
    fixture.detectChanges();
    expect(element.querySelector('.match-stats__empty')?.textContent).toBe(RATE_LIMITED_MESSAGE);
    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelectorAll('app-skeleton').length).toBe(0);

    fixture.componentRef.setInput('error', null);
    fixture.detectChanges();
    expect(element.querySelector('.match-stats__empty')).toBeNull();
    expect(element.querySelectorAll('app-skeleton').length).toBe(9);
  });
});
