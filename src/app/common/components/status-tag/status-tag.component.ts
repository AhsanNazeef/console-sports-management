import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Accent colours from the design system palette; neutral is the muted white used for secondary text.
export type StatusTone = 'yellow' | 'green' | 'red' | 'orange' | 'neutral';

// A small coloured pill for a record's status (a match, a payment). Not interactive.
// The design system's tag is a toggle chip, so statuses get their own read-only pill in the same palette.
@Component({
  selector: 'app-status-tag',
  standalone: true,
  templateUrl: './status-tag.component.html',
  styleUrl: './status-tag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusTagComponent {
  readonly tone = input<StatusTone>('neutral');
  // A pulsing dot before the label, for something happening now (a live match).
  readonly pulse = input(false);
}
