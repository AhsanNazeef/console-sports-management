import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

let nextId = 0;

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class DialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input<string | null>('ic_verified_badge');
  readonly primaryLabel = input('OK');
  readonly primaryDisabled = input(false);
  readonly secondaryLabel = input<string | null>(null);

  readonly primary = output<void>();
  readonly secondary = output<void>();
  readonly closed = output<void>();

  readonly titleId = `dialog-title-${nextId++}`;

  onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
