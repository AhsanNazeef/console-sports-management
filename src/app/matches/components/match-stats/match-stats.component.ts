import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { MATCH_EVENT_LABELS, MATCH_EVENT_TYPES } from '../../constants/matches.constants';
import { MatchStats } from '../../models/match-event.model';

interface StatRow {
  label: string;
  home: number;
  away: number;
}

// Event counts per team, home on the left and away on the right, for the event types that happened.
@Component({
  selector: 'app-match-stats',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './match-stats.component.html',
  styleUrl: './match-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchStatsComponent {
  readonly stats = input<MatchStats | null>(null);
  readonly loading = input(false);
  readonly failed = input(false);

  readonly totalLabel = computed(() => {
    const total = this.stats()?.totalEvents ?? 0;
    return `${total} ${total === 1 ? 'event' : 'events'}`;
  });

  readonly rows = computed<StatRow[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    return MATCH_EVENT_TYPES.map((type) => ({
      label: MATCH_EVENT_LABELS[type],
      home: stats.home.events[type] ?? 0,
      away: stats.away.events[type] ?? 0,
    })).filter((row) => row.home + row.away > 0);
  });
}
