import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline';
export type ButtonSize = 'default' | 'small';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.app-button--full-width]': 'fullWidth()',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('default');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly fullWidth = input(false);
  readonly icon = input<string | null>(null);

  readonly clicked = output<void>();

  onClick(): void {
    if (this.disabled()) return;
    this.clicked.emit();
  }
}
