import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, map, Observable, of, Subject, switchMap } from 'rxjs';
import { ButtonComponent } from '../../common/components/button/button.component';
import { DataTableColumn, DataTableComponent } from '../../common/components/data-table/data-table.component';
import { DialogComponent } from '../../common/components/dialog/dialog.component';
import { EntityAvatarComponent } from '../../common/components/entity-avatar/entity-avatar.component';
import { PaginationComponent } from '../../common/components/pagination/pagination.component';
import { StatusTagComponent, StatusTone } from '../../common/components/status-tag/status-tag.component';
import { TabsComponent } from '../../common/components/tabs/tabs.component';
import { formatDateTime } from '../../common/utils/datetime.util';
import { createPagedList } from '../../common/utils/paged-list.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { MatchFormDialogComponent } from '../components/match-form-dialog/match-form-dialog.component';
import {
  MATCH_EDITOR_ROLES,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_TABS,
  MATCH_STATUS_TONES,
  MATCHES_PAGE_SIZE,
} from '../constants/matches.constants';
import {
  Match,
  MatchFormValue,
  MatchQuery,
  MatchSport,
  MatchStatus,
  MatchStatusFilter,
  MatchTeam,
} from '../models/match.model';
import { MatchListStateService } from '../services/match-list-state.service';
import { MatchesApiService } from '../services/matches-api.service';
import { describeMatchError, matchScore, matchTitle } from '../utils/match.util';

type TeamOptions = { teams: MatchTeam[]; error: null } | { teams: null; error: string };

// Matches under Match Management: status tabs, venue search (header search box), server-side paging and sorting,
// and Schedule / Edit / Delete for the roles that may change matches.
@Component({
  selector: 'app-match-list-page',
  standalone: true,
  imports: [
    ButtonComponent,
    DataTableComponent,
    DialogComponent,
    EntityAvatarComponent,
    MatchFormDialogComponent,
    PaginationComponent,
    RouterLink,
    StatusTagComponent,
    TabsComponent,
  ],
  templateUrl: './match-list.component.html',
  styleUrl: './match-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchListPage {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly listState = inject(MatchListStateService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sportChosen$ = new Subject<string>();

  readonly pageSize = MATCHES_PAGE_SIZE;
  readonly statusTabs = MATCH_STATUS_TABS;
  readonly canEdit = computed(() => this.authService.hasAnyRole(MATCH_EDITOR_ROLES));

  // Starts on the tab, page and order last used; the header search is cleared on every navigation.
  readonly list = createPagedList<Match, MatchQuery>({
    initialQuery: { ...this.listState.query(), search: '' },
    load: (query) => this.matchesApi.getMatches$(query),
  });

  readonly columns = computed<DataTableColumn[]>(() => [
    { key: 'sport', label: 'Sport', width: '14%' },
    { key: 'teams', label: 'Home vs Away', shaded: true },
    { key: 'scheduledAt', label: 'Scheduled At', width: '150px', sortable: true },
    { key: 'venue', label: 'Venue', shaded: true, width: '12%' },
    { key: 'status', label: 'Status', width: '104px' },
    { key: 'score', label: 'Score', shaded: true, width: '64px' },
    ...(this.canEdit() ? [{ key: 'actions', label: 'Actions', width: '80px' }] : []),
  ]);
  readonly sortKey = computed(() => (this.list.query().sortBy === 'scheduledAt' ? 'scheduledAt' : null));

  readonly emptyMessage = computed(() => {
    if (this.list.failed()) return 'Matches could not be loaded.';
    const { search, status } = this.list.query();
    if (search) return `No matches at a venue matching “${search}”.`;
    return status === 'ALL' ? 'No matches yet.' : `No ${MATCH_STATUS_LABELS[status].toLowerCase()} matches.`;
  });

  readonly formOpen = signal(false);
  readonly editing = signal<Match | null>(null);
  readonly deleting = signal<Match | null>(null);
  readonly isSaving = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly deleteHeading = computed(() => {
    const match = this.deleting();
    return match ? `Delete ${matchTitle(match)}?` : '';
  });

  // Options for the Schedule Match popup, loaded when it first opens.
  readonly sportOptions = signal<MatchSport[] | null>(null);
  readonly teamOptions = signal<MatchTeam[] | null>(null);
  readonly optionsError = signal<string | null>(null);

  readonly formatDateTime = formatDateTime;
  readonly statusLabel = (status: MatchStatus): string => MATCH_STATUS_LABELS[status];
  readonly statusTone = (status: MatchStatus): StatusTone => MATCH_STATUS_TONES[status];
  readonly matchTitle = matchTitle;
  readonly matchScore = matchScore;

  constructor() {
    effect(() => this.listState.query.set(this.list.query()));

    this.sportChosen$
      .pipe(
        switchMap((sportId) => {
          this.teamOptions.set(null);
          return this.matchesApi.getTeams$(sportId).pipe(
            map((teams): TeamOptions => ({ teams, error: null })),
            catchError((): Observable<TeamOptions> =>
              of({ teams: null, error: "Couldn't load this sport's teams. Try again." })
            )
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(({ teams, error }) => {
        this.teamOptions.set(teams);
        this.optionsError.set(error);
      });
  }

  selectStatus(status: string): void {
    this.list.query.update((query) => ({ ...query, status: status as MatchStatusFilter, page: 1 }));
  }

  // Newest first → scheduled earliest first → scheduled latest first → back to newest first.
  cycleSort(key: string): void {
    if (key !== 'scheduledAt') {
      return;
    }
    this.list.query.update((query) => {
      if (query.sortBy !== 'scheduledAt') return { ...query, sortBy: 'scheduledAt', sortOrder: 'asc', page: 1 };
      if (query.sortOrder === 'asc') return { ...query, sortOrder: 'desc', page: 1 };
      return { ...query, sortBy: 'createdAt', sortOrder: 'desc', page: 1 };
    });
  }

  openSchedule(): void {
    this.editing.set(null);
    this.actionError.set(null);
    this.optionsError.set(null);
    this.teamOptions.set(null);
    this.formOpen.set(true);
    if (!this.sportOptions()) {
      this.matchesApi
        .getSportOptions$()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (sports) => this.sportOptions.set(sports),
          error: () => this.optionsError.set("Couldn't load the sports. Close this popup and try again."),
        });
    }
  }

  openEdit(match: Match): void {
    this.editing.set(match);
    this.actionError.set(null);
    this.optionsError.set(null);
    this.formOpen.set(true);
  }

  chooseSport(sportId: string): void {
    this.optionsError.set(null);
    this.sportChosen$.next(sportId);
  }

  closeForm(): void {
    if (!this.isSaving()) {
      this.formOpen.set(false);
    }
  }

  saveMatch(value: MatchFormValue): void {
    const editing = this.editing();
    const request$ = editing
      ? this.matchesApi.updateMatch$(editing.id, { scheduledAt: value.scheduledAt, venue: value.venue })
      : this.matchesApi.createMatch$({
          sportId: value.sportId,
          homeTeamId: value.homeTeamId,
          awayTeamId: value.awayTeamId,
          scheduledAt: value.scheduledAt,
          ...(value.venue ? { venue: value.venue } : {}),
        });
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
            // A new match comes first in the default order; Live, Finished and Cancelled wouldn't show it.
            this.list.query.update((query) => ({
              ...query,
              status: query.status === 'ALL' ? 'ALL' : 'SCHEDULED',
              page: 1,
            }));
          }
          this.list.reload();
        },
        error: (error: unknown) => {
          this.reloadIfGone(error);
          this.actionError.set(describeMatchError(error, "Couldn't save the match. Please try again."));
        },
      });
  }

  askToDelete(match: Match): void {
    this.actionError.set(null);
    this.deleting.set(match);
  }

  cancelDelete(): void {
    if (!this.isSaving()) {
      this.deleting.set(null);
    }
  }

  deleteMatch(): void {
    const match = this.deleting();
    if (!match || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.actionError.set(null);
    this.matchesApi
      .deleteMatch$(match.id)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.list.reload();
        },
        error: (error: unknown) => {
          this.reloadIfGone(error);
          this.actionError.set(describeMatchError(error, "Couldn't delete the match. Please try again."));
        },
      });
  }

  private reloadIfGone(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.list.reload();
    }
  }
}
