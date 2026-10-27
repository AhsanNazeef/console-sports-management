import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';
import { MATCH_EVENT_LABELS, MATCH_EVENT_TYPES } from '../../constants/matches.constants';
import { MatchEventType, MatchPlayer, NewMatchEvent } from '../../models/match-event.model';
import { MatchTeam } from '../../models/match.model';

// The Add Event panel of a live match: type, minute, team, a player of that team and an optional note.
// A goal only changes the score when it names the team, so the team is required for a goal.
@Component({
  selector: 'app-match-event-form',
  standalone: true,
  imports: [FormsModule, ButtonComponent, TextInputComponent],
  templateUrl: './match-event-form.component.html',
  styleUrl: './match-event-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchEventFormComponent {
  // Home first, then away.
  readonly teams = input.required<readonly MatchTeam[]>();
  // The players of both teams.
  readonly players = input<readonly MatchPlayer[]>([]);
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  // Changed by the page after an event is added, to clear the form for the next one.
  readonly resetKey = input(0);

  readonly add = output<NewMatchEvent>();

  readonly eventTypes = MATCH_EVENT_TYPES.map((type) => ({ type, label: MATCH_EVENT_LABELS[type] }));

  readonly type = linkedSignal<number, MatchEventType>({ source: this.resetKey, computation: () => 'GOAL' });
  readonly minute = linkedSignal({ source: this.resetKey, computation: () => '' });
  readonly teamId = linkedSignal({ source: this.resetKey, computation: () => '' });
  private readonly playerReset = computed(() => ({ reset: this.resetKey(), teamId: this.teamId() }));
  readonly playerId = linkedSignal({ source: this.playerReset, computation: () => '' });
  readonly detail = linkedSignal({ source: this.resetKey, computation: () => '' });

  readonly teamPlayers = computed(() => this.players().filter((player) => player.teamId === this.teamId()));

  // Short messages: the minute field is narrow.
  readonly minuteError = computed(() => {
    const minute = this.minute().trim();
    if (!minute) return 'Required.';
    return /^\d{1,3}$/.test(minute) ? null : 'Use 0–999.';
  });
  readonly teamError = computed(() =>
    this.type() === 'GOAL' && !this.teamId() ? 'Choose the team that scored.' : null
  );
  readonly canAdd = computed(() => !this.minuteError() && !this.teamError() && !this.saving());

  shownError(control: NgModel, error: string | null): string | null {
    return control.dirty && control.touched ? error : null;
  }

  playerName(player: MatchPlayer): string {
    const name = `${player.firstName} ${player.lastName}`.trim();
    return player.jerseyNumber === null ? name : `${name} (#${player.jerseyNumber})`;
  }

  onSubmit(): void {
    if (!this.canAdd()) {
      return;
    }
    const detail = this.detail().trim();
    this.add.emit({
      type: this.type(),
      minute: Number(this.minute().trim()),
      ...(this.teamId() ? { teamId: this.teamId() } : {}),
      ...(this.playerId() ? { playerId: this.playerId() } : {}),
      ...(detail ? { detail } : {}),
    });
  }
}
