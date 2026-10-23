import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntityAvatarComponent } from '../../../common/components/entity-avatar/entity-avatar.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { SortOrder } from '../../../common/models/api.model';
import { Sport, SportSortField } from '../../models/sport.model';

@Component({
  selector: 'app-sports-table',
  standalone: true,
  imports: [EntityAvatarComponent, RouterLink, SkeletonComponent],
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

  readonly skeletonRows = computed(() => Array.from({ length: this.skeletonRowCount() }));

  readonly nameSort = computed(() => {
    if (this.sortBy() !== 'name') return 'none';
    return this.sortOrder() === 'asc' ? 'ascending' : 'descending';
  });
}
