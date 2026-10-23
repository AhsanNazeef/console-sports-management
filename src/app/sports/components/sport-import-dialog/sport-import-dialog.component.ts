import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { StatCardComponent } from '../../../common/components/stat-card/stat-card.component';
import { SportImportProgress } from '../../models/sport-import.model';

// "Import Sports" popup: choose a CSV or JSON file, follow the rows being sent, then read the totals.
// The page reads the file and runs the import; this only shows where it is.
@Component({
  selector: 'app-sport-import-dialog',
  standalone: true,
  imports: [ButtonComponent, ModalComponent, StatCardComponent],
  templateUrl: './sport-import-dialog.component.html',
  styleUrl: './sport-import-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportImportDialogComponent {
  readonly open = input(false);
  // Rows found in the chosen file, or why it can't be used.
  readonly rowCount = input<number | null>(null);
  readonly fileError = input<string | null>(null);
  readonly progress = input<SportImportProgress | null>(null);
  readonly importing = input(false);

  readonly fileChosen = output<File>();
  readonly startImport = output<void>();
  readonly closed = output<void>();

  readonly finished = computed(() => {
    const progress = this.progress();
    return !!progress && !this.importing() && progress.done === progress.total;
  });
  // The row being sent now, counted from 1.
  readonly currentRow = computed(() => {
    const progress = this.progress();
    return progress ? Math.min(progress.done + 1, progress.total) : 0;
  });
  readonly canStart = computed(() => !!this.rowCount() && !this.fileError() && !this.importing());

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.fileChosen.emit(file);
    }
  }
}
