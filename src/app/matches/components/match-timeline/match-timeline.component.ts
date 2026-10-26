import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DataTableColumn, DataTableComponent } from '../../../common/components/data-table/data-table.component';
import { StatusTagComponent, StatusTone } from '../../../common/components/status-tag/status-tag.component';
import { MATCH_EVENT_LABELS, MATCH_EVENT_TONES } from '../../constants/matches.constants';
import { MatchEvent, MatchPlayer } from '../../models/match-event.model';
import { MatchTeam } from '../../models/match.model';

interface TimelineRow {
  id: string;
  minute: string;
  type: string;
  tone: StatusTone;
  team: string;
  player: string;
  detail: string;
}

// Every event of a match in order: minute, type, team, player and detail.
// Names come from the event itself, or else from the match's teams and their players (live events carry only ids).
@Component({
  selector: 'app-match-timeline',
  standalone: true,
  imports: [DataTableComponent, StatusTagComponent],
  templateUrl: './match-timeline.component.html',
  styleUrl: './match-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchTimelineComponent {
  readonly events = input.required<readonly MatchEvent[]>();
  readonly teams = input<readonly MatchTeam[]>([]);
  readonly players = input<readonly MatchPlayer[]>([]);
  readonly loading = input(false);
  readonly failed = input(false);

  readonly columns: DataTableColumn[] = [
    { key: 'minute', label: 'Minute', width: '64px' },
    { key: 'type', label: 'Type', shaded: true, width: '128px' },
    { key: 'team', label: 'Team' },
    { key: 'player', label: 'Player', shaded: true },
    { key: 'detail', label: 'Detail' },
  ];

  readonly rows = computed<TimelineRow[]>(() => {
    const teamNames = new Map(this.teams().map((team) => [team.id, team.name]));
    const playerNames = new Map(this.players().map((player) => [player.id, fullName(player)]));
    return this.events().map((event) => ({
      id: event.id,
      minute: `${event.minute}'`,
      type: MATCH_EVENT_LABELS[event.type],
      tone: MATCH_EVENT_TONES[event.type],
      team: event.team?.name ?? (event.teamId && teamNames.get(event.teamId)) ?? '—',
      player: (event.player && fullName(event.player)) ?? (event.playerId && playerNames.get(event.playerId)) ?? '—',
      detail: event.detail || '—',
    }));
  });

  readonly emptyMessage = computed(() => (this.failed() ? 'The timeline could not be loaded.' : 'No events yet.'));
}

function fullName(player: Pick<MatchPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`.trim();
}
