import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, finalize, forkJoin, map, switchMap } from 'rxjs';
import { Breadcrumb, BreadcrumbsComponent } from '../../common/components/breadcrumbs/breadcrumbs.component';
import { ButtonComponent } from '../../common/components/button/button.component';
import { DialogComponent } from '../../common/components/dialog/dialog.component';
import { describeHttpError } from '../../common/utils/http-error.util';
import { createReloadable } from '../../common/utils/reloadable.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { MatchEventFormComponent } from '../components/match-event-form/match-event-form.component';
import { MatchHeaderComponent, MatchScore } from '../components/match-header/match-header.component';
import { MatchStatsComponent } from '../components/match-stats/match-stats.component';
import { MatchTimelineComponent } from '../components/match-timeline/match-timeline.component';
import { MATCH_EDITOR_ROLES } from '../constants/matches.constants';
import { MatchEvent, MatchLiveUpdate, NewMatchEvent } from '../models/match-event.model';
import { MatchLiveService } from '../services/match-live.service';
import { MatchesApiService } from '../services/matches-api.service';
import { MatchStatusAction, matchStatusActions } from '../utils/match-status.util';
import { describeMatchError, matchScore, matchTitle, mergeEvents } from '../utils/match.util';

// A match opened from the Matches table: header with the score, status buttons that follow the backend's rules,
// the Add Event panel while it is live, the timeline of events and the per-team stats. The address bar keeps
// showing /matches. While the page is open it follows the match over Socket.IO (no polling), so changes made in
// another window show up here without a refresh.
@Component({
  selector: 'app-match-detail-page',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    DialogComponent,
    MatchEventFormComponent,
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
  private readonly matchLive = inject(MatchLiveService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // From the route (/matches/:matchId).
  readonly matchId = input.required<string>();

  readonly match = createReloadable((id) => this.matchesApi.getMatch$(id), this.matchId);
  readonly scoreboard = createReloadable((id) => this.matchesApi.getScoreboard$(id), this.matchId);
  readonly timeline = createReloadable((id) => this.matchesApi.getTimeline$(id), this.matchId);
  readonly stats = createReloadable((id) => this.matchesApi.getStats$(id), this.matchId);

  // Both teams' players, to fill the Add Event form and to name the players in live events.
  private readonly teamIds = computed(() => {
    const match = this.match.value();
    return match ? `${match.homeTeamId},${match.awayTeamId}` : '';
  });
  readonly players = createReloadable(
    (ids) =>
      forkJoin(ids.split(',').map((teamId) => this.matchesApi.getPlayers$(teamId))).pipe(map((lists) => lists.flat())),
    this.teamIds
  );

  // The loaded timeline and scoreboard, kept up to date by live messages until they are loaded again.
  readonly events = linkedSignal<readonly MatchEvent[]>(() => this.timeline.value() ?? []);
  readonly latestScoreboard = linkedSignal(() => this.scoreboard.value());

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
    const scoreboard = this.latestScoreboard();
    const match = this.match.value();
    if (scoreboard) return { home: scoreboard.home.score, away: scoreboard.away.score };
    return match ? { home: match.homeScore, away: match.awayScore } : null;
  });
  // Only the moves the backend allows from the current status.
  readonly statusActions = computed(() => {
    const match = this.match.value();
    return match && this.canEdit() ? matchStatusActions(match.status) : [];
  });

  // Events can only be added to a live match (the backend answers 400 otherwise).
  readonly showEventForm = computed(() => this.canEdit() && this.match.value()?.status === 'LIVE');

  readonly confirming = signal<MatchStatusAction | null>(null);
  readonly isSaving = signal(false);
  readonly statusError = signal<string | null>(null);
  readonly addingEvent = signal(false);
  readonly eventError = signal<string | null>(null);
  readonly eventFormReset = signal(0);

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

  constructor() {
    // Joins the match's room while the page shows it and leaves it when the page closes or shows another match.
    toObservable(this.matchId)
      .pipe(
        filter((id) => !!id),
        distinctUntilChanged(),
        switchMap((id) => this.matchLive.watch$(id)),
        takeUntilDestroyed()
      )
      .subscribe((update) => this.applyLiveUpdate(update));
  }

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

  addEvent(input: NewMatchEvent): void {
    if (this.addingEvent()) {
      return;
    }
    this.addingEvent.set(true);
    this.eventError.set(null);
    this.matchesApi
      .addEvent$(this.matchId(), input)
      .pipe(
        finalize(() => this.addingEvent.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (event) => {
          this.eventFormReset.update((key) => key + 1);
          // The socket usually brings the event first; whichever comes second changes nothing.
          if (this.addArrivedEvent(event)) {
            this.scoreboard.reload();
          }
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 400) {
            this.refresh();
          }
          this.eventError.set(this.describeEventError(error));
        },
      });
  }

  private applyLiveUpdate(update: MatchLiveUpdate): void {
    switch (update.kind) {
      case 'event':
        this.addArrivedEvent(update.event);
        break;
      case 'scoreboard':
        this.latestScoreboard.set(update.scoreboard);
        break;
      case 'status':
        // The match record has the start and finish times that go with the new status.
        if (update.status !== this.match.value()?.status) {
          this.refresh();
        }
        break;
    }
  }

  // Adds an event to the timeline unless it is already there, and then refreshes the stats.
  private addArrivedEvent(event: MatchEvent): boolean {
    const current = this.events();
    const merged = mergeEvents(current, [event]);
    if (merged === current) {
      return false;
    }
    this.events.set(merged);
    this.stats.reload();
    return true;
  }

  // The backend's 400s for events are readable, for example "Events can only be added to a live match".
  private describeEventError(error: unknown): string {
    return describeHttpError(error, "Couldn't add the event. Please try again.");
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
