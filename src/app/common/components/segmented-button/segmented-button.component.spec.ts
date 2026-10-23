import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegmentedButtonComponent } from './segmented-button.component';

describe('SegmentedButtonComponent', () => {
  let fixture: ComponentFixture<SegmentedButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SegmentedButtonComponent] }).compileComponents();
    fixture = TestBed.createComponent(SegmentedButtonComponent);
    fixture.componentRef.setInput('options', [
      { value: 'squad', label: 'Squad' },
      { value: 'staff', label: 'Staff' },
    ]);
    fixture.componentRef.setInput('value', 'squad');
    fixture.detectChanges();
  });

  const options = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="radio"]'));

  it('marks the selected option', () => {
    expect(options()[0].getAttribute('aria-checked')).toBe('true');
    expect(options()[0].classList).toContain('segmented__option--selected');
    expect(options()[1].getAttribute('aria-checked')).toBe('false');
  });

  it('emits the value of the clicked option', () => {
    const changes: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => changes.push(value));
    options()[1].click();
    expect(changes).toEqual(['staff']);
  });
});
