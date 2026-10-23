import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-segmented-button',
  standalone: true,
  templateUrl: './segmented-button.component.html',
  styleUrl: './segmented-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedButtonComponent {
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);

  readonly valueChange = output<string>();
}
