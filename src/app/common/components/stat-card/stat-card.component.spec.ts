import { TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  it('shows the formatted total and its label, or a dash while unknown', async () => {
    await TestBed.configureTestingModule({ imports: [StatCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Sports');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.stat-card__value')?.textContent).toBe('—');

    fixture.componentRef.setInput('value', 1347);
    fixture.detectChanges();
    expect(element.querySelector('.stat-card__value')?.textContent).toBe('1,347');
    expect(element.querySelector('.stat-card__label')?.textContent).toBe('Sports');
  });
});
