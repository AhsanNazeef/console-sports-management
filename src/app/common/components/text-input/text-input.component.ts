import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type TextInputType = 'text' | 'email' | 'password' | 'search' | 'url';
export type TextInputStatus = 'valid' | 'invalid';

let nextId = 0;

@Component({
  selector: 'app-text-input',
  standalone: true,
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
})
export class TextInputComponent implements ControlValueAccessor {
  readonly inputId = input(`text-input-${nextId++}`);
  readonly type = input<TextInputType>('text');
  readonly placeholder = input('');
  readonly autocomplete = input<string | null>(null);
  readonly message = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly status = input<TextInputStatus | null>(null);
  readonly clearable = input(true);
  // Password fields only: adds an eye button that shows or hides what was typed.
  readonly revealable = input(false);

  readonly value = signal('');
  readonly isDisabled = signal(false);
  readonly revealed = signal(false);
  readonly fieldType = computed(() => (this.type() === 'password' && this.revealed() ? 'text' : this.type()));

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  onBlur(): void {
    this.onTouched();
  }

  clear(): void {
    this.value.set('');
    this.onChange('');
  }

  toggleRevealed(): void {
    this.revealed.update((revealed) => !revealed);
  }
}
