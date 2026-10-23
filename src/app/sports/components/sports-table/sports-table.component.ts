import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { SortOrder } from '../../../common/models/api.model';
import { SPORT_ACCENTS } from '../../constants/sports.constants';
import { Sport, SportSortField } from '../../models/sport.model';

@Component({
  selector: 'app-sports-table',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './sports-table.component.html',
  styleUrl: './sports-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportsTableComponent {
  readonly sports = input.required<readonly Sport[]>();
  readonly canEdit = input(false);
  readonly sortBy = input<SportSortField>('createdAt');
  readonly sortOrder = input<SortOrder>('desc');
  readonly loading = input(false);
  readonly emptyMessage = input('No sports yet.');
  // Placeholder rows shown while the first page loads; match the page size so the height doesn't change.
  readonly skeletonRowCount = input(10);

  readonly sortByName = output<void>();
  readonly edit = output<Sport>();
  readonly remove = output<Sport>();

  // Icons whose link didn't load; those rows fall back to a lettered badge.
  private readonly brokenIcons = signal<ReadonlySet<string>>(new Set());

  readonly skeletonRows = computed(() => Array.from({ length: this.skeletonRowCount() }));

  readonly nameSort = computed(() => {
    if (this.sortBy() !== 'name') return 'none';
    return this.sortOrder() === 'asc' ? 'ascending' : 'descending';
  });

  showIcon(sport: Sport): boolean {
    return !!sport.iconUrl && !this.brokenIcons().has(sport.id);
  }

  markIconBroken(id: string): void {
    this.brokenIcons.update((broken) => new Set(broken).add(id));
  }

  // The same sport always gets the same accent, so it stays put across reloads.
  accentFor(id: string): string {
    const hash = [...id].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
    return SPORT_ACCENTS[hash % SPORT_ACCENTS.length];
  }
}
