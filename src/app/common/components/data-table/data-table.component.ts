import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, input, TemplateRef } from '@angular/core';
import { SkeletonComponent } from '../skeleton/skeleton.component';

export interface DataTableColumn {
  key: string;
  label: string;
  // Alternate columns get the faint background from the Figma tables.
  shaded?: boolean;
  width?: string;
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

  readonly cell = contentChild.required<TemplateRef<DataTableCellContext<T>>>(TemplateRef);

  readonly skeletonRows = computed(() => Array.from({ length: this.skeletonRowCount() }));
}
