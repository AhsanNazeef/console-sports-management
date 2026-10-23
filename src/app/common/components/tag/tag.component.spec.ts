import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagComponent } from './tag.component';

describe('TagComponent', () => {
  let fixture: ComponentFixture<TagComponent>;
  let button: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TagComponent] }).compileComponents();
    fixture = TestBed.createComponent(TagComponent);
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button');
  });

  it('asks to be selected when clicked while off', () => {
    const changes: boolean[] = [];
    fixture.componentInstance.selectedChange.subscribe((value) => changes.push(value));
    button.click();
    expect(changes).toEqual([true]);
  });

  it('shows the selected state and asks to be deselected', () => {
    const changes: boolean[] = [];
    fixture.componentInstance.selectedChange.subscribe((value) => changes.push(value));
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    button.click();
    expect(button.classList).toContain('tag--selected');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(changes).toEqual([false]);
  });
});
