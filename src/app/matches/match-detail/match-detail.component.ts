import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Breadcrumb, BreadcrumbsComponent } from '../../common/components/breadcrumbs/breadcrumbs.component';
import { ButtonComponent } from '../../common/components/button/button.component';
import { DialogComponent } from '../../common/components/dialog/dialog.component';
import { createReloadable } from '../../common/utils/reloadable.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { MatchHeaderComponent, MatchScore } from '../components/match-header/match-header.component';
import { MatchStatsComponent } from '../components/match-stats/match-stats.component';
import { MatchTimelineComponent } from '../components/match-timeline/match-timeline.component';
import { MATCH_EDITOR_ROLES } from '../constants/matches.constants';
import { MatchesApiService } from '../services/matches-api.service';
import { MatchStatusAction, matchStatusActions } from '../utils/match-status.util';
import { describeMatchError, matchScore, matchTitle } from '../utils/match.util';

// A match opened from the Matches table: header with the score, status buttons that follow the backend's rules,
// the timeline of events and the per-team stats. The address bar keeps showing /matches.
@Component({
  selector: 'app-match-detail-page',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    DialogComponent,
    MatchHeaderComponent,
    MatchStatsComponent,
    MatchTimelineComponent,
    RouterLink,
  ],
  templateUrl: './match-detail.component.html',
  styleUrl: './match-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDetailPage {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // From the route (/matches/:matchId).
  readonly matchId = input.required<string>();

  readonly match = createReloadable((id) => this.matchesApi.getMatch$(id), this.matchId);
  readonly scoreboard = createReloadable((id) => this.matchesApi.getScoreboard$(id), this.matchId);
  readonly timeline = createReloadable((id) => this.matchesApi.getTimeline$(id), this.matchId);
  readonly stats = createReloadable((id) => this.matchesApi.getStats$(id), this.matchId);

  readonly canEdit = computed(() => this.authService.hasAnyRole(MATCH_EDITOR_ROLES));
  readonly notFound = computed(() => !this.match.value() && this.match.errorStatus() === 404);
  readonly title = computed(() => {
    const match = this.match.value();
    return match ? matchTitle(match) : '';
  });
  readonly breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: 'Matches', link: '/matches' },
    { label: this.title() || 'Match' },
  ]);
  readonly teams = computed(() => {
    const match = this.match.value();
    return match ? [match.homeTeam, match.awayTeam] : [];
  });
  // The scoreboard's score, else the match record's.
  readonly score = computed<MatchScore | null>(() => {
    const scoreboard = this.scoreboard.value();
    const match = this.match.value();
    if (scoreboard) return { home: scoreboard.home.score, away: scoreboard.away.score };
    return match ? { home: match.homeScore, away: match.awayScore } : null;
  });
  // Only the moves the backend allows from the current status.
  readonly statusActions = computed(() => {
    const match = this.match.value();
    return match && this.canEdit() ? matchStatusActions(match.status) : [];
  });

  readonly confirming = signal<MatchStatusAction | null>(null);
  readonly isSaving = signal(false);
  readonly statusError = signal<string | null>(null);

  readonly confirmHeading = computed(() => {
    const action = this.confirming();
    return action ? `${action.label.split(' ')[0]} ${this.title()}?` : '';
  });
  readonly confirmDescription = computed(() => {
    const action = this.confirming();
    const match = this.match.value();
    if (!action || !match) return null;
    return action.status === 'FINISHED'
      ? `The final score will be ${matchScore(match)}. A finished match can't be changed or started again.`
      : "A cancelled match can't be started again.";
  });

  requestStatus(action: MatchStatusAction): void {
    this.statusError.set(null);
    if (action.confirm) {
      this.confirming.set(action);
    } else {
      this.changeStatus(action);
    }
  }

  cancelConfirm(): void {
    if (!this.isSaving()) {
      this.confirming.set(null);
    }
  }

  changeStatus(action: MatchStatusAction | null = this.confirming()): void {
    if (!action || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.statusError.set(null);
    this.matchesApi
      .changeStatus$(this.matchId(), action.status)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.confirming.set(null);
          this.refresh();
        },
        error: (error: unknown) => {
          this.statusError.set(this.describeStatusError(error));
          this.refresh();
        },
      });
  }

  private refresh(): void {
    this.match.reload();
    this.scoreboard.reload();
  }

  // A 400 here means the status changed elsewhere since the page loaded; the reload shows the buttons for the new one.
  private describeStatusError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'The match status changed meanwhile, so that move is no longer allowed. The page now shows its current status.';
    }
    return describeMatchError(error, "Couldn't change the match status. Please try again.");
  }
}
