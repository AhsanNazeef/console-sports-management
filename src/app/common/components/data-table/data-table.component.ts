import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, input, output, TemplateRef } from '@angular/core';
import { SortOrder } from '../../models/api.model';
import { SkeletonComponent } from '../skeleton/skeleton.component';

export interface DataTableColumn {
  key: string;
  label: string;
  // Alternate columns get the faint background from the Figma tables.
  shaded?: boolean;
  width?: string;
  // The header becomes a button that emits sortChange with the column key; the page decides the order.
  sortable?: boolean;
}

export interface DataTableCellContext<T> {
  $implicit: T;
  key: string;
}

// Table in the console's style. Each cell is drawn by the projected <ng-template let-row let-key="key">.
// Shows skeleton rows on the first load and dims the rows during later loads.
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, SkeletonComponent],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends { id: string }> {
  readonly label = input.required<string>();
  readonly columns = input.required<readonly DataTableColumn[]>();
  readonly rows = input.required<readonly T[]>();
  readonly loading = input(false);
  readonly emptyMessage = input('Nothing here yet.');
  readonly skeletonRowCount = input(10);
  // Below this width the table scrolls sideways instead of squeezing its columns (480px when not set).
  readonly minWidth = input<string | null>(null);
  // The column the rows are sorted by, if it is one of the sortable ones.
  readonly sortKey = input<string | null>(null);
  readonly sortOrder = input<SortOrder>('asc');

  readonly sortChange = output<string>();

  readonly cell = contentChild.required<TemplateRef<DataTableCellContext<T>>>(TemplateRef);

  readonly skeletonRows = computed(() => Array.from({ length: this.skeletonRowCount() }));

  ariaSort(column: DataTableColumn): 'ascending' | 'descending' | 'none' | null {
    if (!column.sortable) return null;
    if (column.key !== this.sortKey()) return 'none';
    return this.sortOrder() === 'asc' ? 'ascending' : 'descending';
  }
}
