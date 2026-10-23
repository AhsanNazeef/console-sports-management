import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextInputComponent } from './text-input.component';

describe('TextInputComponent', () => {
  let fixture: ComponentFixture<TextInputComponent>;
  let component: TextInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TextInputComponent] }).compileComponents();
    fixture = TestBed.createComponent(TextInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const field = (): HTMLInputElement => fixture.nativeElement.querySelector('input');

  it('shows the value written by the form', () => {
    component.writeValue('admin@buzzer.dev');
    fixture.detectChanges();
    expect(field().value).toBe('admin@buzzer.dev');
  });

  it('reports typed values to the form', () => {
    const changes: string[] = [];
    component.registerOnChange((value) => changes.push(value));
    field().value = 'hello';
    field().dispatchEvent(new Event('input'));
    expect(changes).toEqual(['hello']);
  });

  it('clears the value with the clear button', () => {
    const changes: string[] = [];
    component.registerOnChange((value) => changes.push(value));
    component.writeValue('hello');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.text-input__clear') as HTMLButtonElement).click();
    expect(changes).toEqual(['']);
    expect(component.value()).toBe('');
  });

  it('shows the error message in the error state', () => {
    fixture.componentRef.setInput('error', 'Email is required.');
    fixture.detectChanges();
    const message = fixture.nativeElement.querySelector('.text-input__message') as HTMLElement;
    expect(message.textContent).toContain('Email is required.');
    expect(fixture.nativeElement.querySelector('.text-input--error')).not.toBeNull();
    expect(field().getAttribute('aria-invalid')).toBe('true');
  });

  it('disables the field when the form disables it', () => {
    component.setDisabledState(true);
    fixture.detectChanges();
    expect(field().disabled).toBe(true);
  });
});
