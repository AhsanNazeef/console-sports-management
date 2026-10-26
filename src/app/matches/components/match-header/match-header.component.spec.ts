import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchStatus } from '../../models/match.model';
import { match } from '../../testing/match.fixtures';
import { MatchHeaderComponent } from './match-header.component';

describe('MatchHeaderComponent', () => {
  let fixture: ComponentFixture<MatchHeaderComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MatchHeaderComponent] }).compileComponents();
    fixture = TestBed.createComponent(MatchHeaderComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  function show(status: MatchStatus): void {
    fixture.componentRef.setInput('match', match('m1', status));
    fixture.componentRef.setInput('score', { home: 3, away: 1 });
    fixture.detectChanges();
  }

  const labels = (): string[] =>
    Array.from(element.querySelectorAll('.match-header__label')).map((label) => label.textContent?.trim() ?? '');

  it('shows skeletons until the match arrives', () => {
    fixture.detectChanges();
    expect(element.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    expect(element.querySelector('.match-header__team')).toBeNull();
  });

  it('shows the sport, both teams and "vs" before kick-off', () => {
    show('SCHEDULED');
    expect(element.querySelector('.match-header__sport-name')?.textContent).toBe('Hockey');
    expect(Array.from(element.querySelectorAll('.match-header__team')).map((team) => team.textContent)).toEqual([
      'Fan City',
      'Buzzer United',
    ]);
    expect(element.querySelector('.match-header__vs')?.textContent).toBe('vs');
    expect(element.querySelector('app-status-tag')?.textContent?.trim()).toBe('Scheduled');
    expect(labels()).toEqual(['Venue', 'Scheduled']);
  });

  it('shows the current score and the start time while live', () => {
    show('LIVE');
    expect(element.querySelector('.match-header__score')?.textContent?.trim()).toBe('3 – 1');
    expect(element.querySelector('.status-tag__dot')).not.toBeNull();
    expect(labels()).toEqual(['Venue', 'Scheduled', 'Started']);
  });

  it('shows the finish time once finished', () => {
    show('FINISHED');
    expect(labels()).toEqual(['Venue', 'Scheduled', 'Started', 'Finished']);
  });
});
