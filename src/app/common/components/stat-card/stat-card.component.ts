import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [DecimalPipe, SkeletonComponent],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  // null while loading (shimmer) or when the total couldn't be fetched (dash).
  readonly value = input<number | null>(null);
  readonly label = input.required<string>();
  readonly loading = input(false);
}
