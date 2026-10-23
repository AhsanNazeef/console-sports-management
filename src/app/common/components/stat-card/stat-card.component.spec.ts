import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Sports');
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const value = (): string => element.querySelector('.stat-card__value')?.textContent?.trim() ?? '';

  it('shows the formatted total and its label', () => {
    fixture.componentRef.setInput('value', 1347);
    fixture.detectChanges();
    expect(value()).toBe('1,347');
    expect(element.querySelector('.stat-card__label')?.textContent).toBe('Sports');
  });

  it('shimmers while loading and shows a dash when the total is unavailable', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(element.querySelector('app-skeleton')).toBeTruthy();

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(element.querySelector('app-skeleton')).toBeNull();
    expect(value()).toBe('—');
  });
});
