import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, from } from 'rxjs';
import { Breadcrumb, BreadcrumbsComponent } from '../../common/components/breadcrumbs/breadcrumbs.component';
import { ButtonComponent } from '../../common/components/button/button.component';
import { DialogComponent } from '../../common/components/dialog/dialog.component';
import { PaginationComponent } from '../../common/components/pagination/pagination.component';
import { StatCardComponent } from '../../common/components/stat-card/stat-card.component';
import { describeHttpError } from '../../common/utils/http-error.util';
import { createPagedList } from '../../common/utils/paged-list.util';
import { createReloadable } from '../../common/utils/reloadable.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { SportFormDialogComponent } from '../components/sport-form-dialog/sport-form-dialog.component';
import { SportImportDialogComponent } from '../components/sport-import-dialog/sport-import-dialog.component';
import { SportsTableComponent } from '../components/sports-table/sports-table.component';
import { CATALOGUE_EDITOR_ROLES, DEFAULT_SPORT_QUERY, SPORTS_PAGE_SIZE } from '../constants/sports.constants';
import { SportImportProgress, SportImportRow } from '../models/sport-import.model';
import { Sport, SportInput, SportQuery } from '../models/sport.model';
import { SportImportService } from '../services/sport-import.service';
import { SportsApiService } from '../services/sports-api.service';
import { parseSportImport } from '../utils/sport-import.util';

@Component({
  selector: 'app-sport-list-page',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    DialogComponent,
    PaginationComponent,
    SportFormDialogComponent,
    SportImportDialogComponent,
    SportsTableComponent,
    StatCardComponent,
  ],
  templateUrl: './sport-list.component.html',
  styleUrl: './sport-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportListPage {
  private readonly sportsApi = inject(SportsApiService);
  private readonly sportImport = inject(SportImportService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly breadcrumbs: Breadcrumb[] = [{ label: 'Sport' }];
  readonly pageSize = SPORTS_PAGE_SIZE;
  readonly canEdit = computed(() => this.authService.hasAnyRole(CATALOGUE_EDITOR_ROLES));

  // Server-side search (header search box), paging and sorting.
  readonly list = createPagedList<Sport, SportQuery>({
    initialQuery: DEFAULT_SPORT_QUERY,
    load: (query) => this.sportsApi.getSports$(query),
  });
  readonly totals = createReloadable(() => this.sportsApi.getCatalogueTotals$());

  readonly formOpen = signal(false);
  readonly editing = signal<Sport | null>(null);
  readonly deleting = signal<Sport | null>(null);
  readonly isSaving = signal(false);
  readonly actionError = signal<string | null>(null);

  // Bulk import from a CSV or JSON file.
  readonly importOpen = signal(false);
  readonly importRows = signal<SportImportRow[] | null>(null);
  readonly importFileError = signal<string | null>(null);
  readonly importProgress = signal<SportImportProgress | null>(null);
  readonly importing = signal(false);

  // Shown when there are no rows and nothing is loading (the table shows skeleton rows while it loads).
  readonly emptyMessage = computed(() => {
    if (this.list.failed()) return 'Sports could not be loaded.';
    const search = this.list.query().search;
    return search ? `No sports match “${search}”.` : 'No sports yet.';
  });

  // Newest first → name A–Z → name Z–A → back to newest first.
  cycleNameSort(): void {
    this.list.query.update((query) => {
      if (query.sortBy !== 'name') return { ...query, sortBy: 'name', sortOrder: 'asc', page: 1 };
      if (query.sortOrder === 'asc') return { ...query, sortOrder: 'desc', page: 1 };
      return { ...query, sortBy: 'createdAt', sortOrder: 'desc', page: 1 };
    });
  }

  retry(): void {
    this.list.reload();
    this.totals.reload();
  }

  openAdd(): void {
    this.editing.set(null);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  openEdit(sport: Sport): void {
    this.editing.set(sport);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.isSaving()) {
      this.formOpen.set(false);
    }
  }

  saveSport(input: SportInput): void {
    const editing = this.editing();
    const request$ = editing ? this.sportsApi.updateSport$(editing.id, input) : this.sportsApi.createSport$(input);
    this.isSaving.set(true);
    this.actionError.set(null);
    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          if (!editing) {
            // New sports come first in the default order, so show page 1.
            this.list.goToPage(1);
            this.totals.reload();
          }
          this.list.reload();
        },
        error: (error: unknown) => this.actionError.set(this.describeSaveError(error, input.name)),
      });
  }

  askToDelete(sport: Sport): void {
    this.actionError.set(null);
    this.deleting.set(sport);
  }

  cancelDelete(): void {
    if (!this.isSaving()) {
      this.deleting.set(null);
    }
  }

  deleteSport(): void {
    const sport = this.deleting();
    if (!sport || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.actionError.set(null);
    this.sportsApi
      .deleteSport$(sport.id)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.list.reload();
          this.totals.reload();
        },
        error: (error: unknown) =>
          this.actionError.set(describeHttpError(error, "Couldn't delete the sport. Please try again.")),
      });
  }

  openImport(): void {
    this.importRows.set(null);
    this.importFileError.set(null);
    this.importProgress.set(null);
    this.importOpen.set(true);
  }

  readImportFile(file: File): void {
    this.importRows.set(null);
    this.importFileError.set(null);
    from(file.text())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (text) => {
          const parsed = parseSportImport(file.name, text);
          this.importRows.set(parsed.rows);
          this.importFileError.set(parsed.error);
        },
        error: () => this.importFileError.set("Couldn't read this file. Choose it again."),
      });
  }

  startImport(): void {
    const rows = this.importRows();
    if (!rows || this.importing()) {
      return;
    }
    this.importing.set(true);
    this.sportImport
      .import$(rows)
      .pipe(
        finalize(() => this.importing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (progress) => this.importProgress.set(progress),
        complete: () => {
          // Added sports come first in the default order.
          this.list.goToPage(1);
          this.list.reload();
          this.totals.reload();
        },
      });
  }

  // The popup stays open until every row has been sent.
  closeImport(): void {
    if (!this.importing()) {
      this.importOpen.set(false);
    }
  }

  private describeSaveError(error: unknown, name: string): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return `A sport called “${name}” already exists, or was deleted and its name is still reserved. Try another name.`;
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.list.reload();
      return 'This sport no longer exists. Someone may have deleted it.';
    }
    return describeHttpError(error, "Couldn't save the sport. Please try again.");
  }
}
