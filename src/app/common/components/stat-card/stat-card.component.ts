import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [DecimalPipe, SkeletonComponent],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.stat-card--compact]': 'compact()',
  },
})
export class StatCardComponent {
  // null while loading (shimmer) or when the total couldn't be fetched (dash). A list of totals the backend formatted
  // (such as "$364.10", one per currency) is shown as given, one line each.
  readonly value = input<number | readonly string[] | null>(null);
  readonly label = input.required<string>();
  // An optional second line under the label, such as a count beside a total.
  readonly detail = input<string | null>(null);
  readonly loading = input(false);
  // The smaller card beside a governing body's header (Figma "UEFA" screen).
  readonly compact = input(false);

  readonly numberValue = computed(() => {
    const value = this.value();
    return typeof value === 'number' ? value : null;
  });
  // An empty list counts as no value.
  readonly lines = computed(() => {
    const value = this.value();
    return Array.isArray(value) && value.length > 0 ? (value as readonly string[]) : null;
  });
}
